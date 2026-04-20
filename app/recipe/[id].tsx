import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  SafeAreaView,
  Image,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Share,
  Platform,
} from 'react-native';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import * as Speech from 'expo-speech';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
// expo-speech-recognition requires a dev/production build — not available in Expo Go.
// We load it dynamically so the app degrades gracefully in Expo Go.
let ExpoSpeechRecognitionModule: {
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  start: (opts: object) => void;
  stop: () => void;
} | null = null;

let useSpeechRecognitionEvent: (
  event: string,
  handler: (e: any) => void
) => void = () => {};  // no-op hook — safe to call unconditionally

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const stt = require('expo-speech-recognition');
  ExpoSpeechRecognitionModule = stt.ExpoSpeechRecognitionModule;
  useSpeechRecognitionEvent = stt.useSpeechRecognitionEvent;
} catch {
  // Expo Go: STT unavailable — voice command buttons still render
}

import { Colors } from '@/constants/Colors';
import { Recipe } from '@/types';
import { saveRecipe, removeSavedRecipe, isRecipeSaved, addRating } from '@/services/recipeService';
import { addItemToList, getShoppingLists, createShoppingList } from '@/services/shoppingService';
import { updatePantryAfterCooking } from '@/services/pantryService';
import { markRecipeAsCooked, addNeedsReviewItems } from '@/services/cookedRecipes';
import { useAuth } from '@/hooks/useAuth';

type Tab = 'ingredients' | 'instructions' | 'reviews';

function StarRating({
  value,
  onChange,
  size = 28,
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <TouchableOpacity
          key={star}
          onPress={() => onChange?.(star)}
          disabled={!onChange}
        >
          <Text style={{ fontSize: size }}>{star <= value ? '⭐' : '☆'}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function getRecipeImage(recipe: Recipe): string {
  if (recipe.imageUrl) return recipe.imageUrl;

  const haystack = [
    recipe.title,
    recipe.description,
    recipe.cuisine,
    ...(recipe.tags ?? []),
    ...recipe.ingredients.map((i) => i.name),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (haystack.includes('lasagna')) {
    return 'https://images.unsplash.com/photo-1619895092538-128341789043?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('spaghetti') || haystack.includes('pasta')) {
    return 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('soup') || haystack.includes('bisque') || haystack.includes('stew')) {
    return 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('stir-fry') || haystack.includes('noodle') || haystack.includes('asian')) {
    return 'https://images.unsplash.com/photo-1617622141573-39b5b8f3c4db?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('salad')) {
    return 'https://images.unsplash.com/photo-1546793665-c74683f339c1?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('sandwich') || haystack.includes('burger')) {
    return 'https://images.unsplash.com/photo-1550317138-10000687a72b?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('breakfast') || haystack.includes('egg') || haystack.includes('toast')) {
    return 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=1200&q=80&auto=format&fit=crop';
  }
  if (haystack.includes('rice')) {
    return 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200&q=80&auto=format&fit=crop';
  }

  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1200&q=80&auto=format&fit=crop';
}

function buildShareMessage(recipe: Recipe) {
  const keyIngredients = recipe.ingredients.slice(0, 8).map((i) => `• ${i.name} (${i.amount})`);
  const quickSteps = recipe.steps.slice(0, 3).map((step) => `${step.stepNumber}. ${step.description}`);
  const missingSection =
    recipe.missingIngredients.length > 0
      ? `\nNeed to buy:\n${recipe.missingIngredients.map((i) => `• ${i}`).join('\n')}`
      : '';

  return [
    `🍳 ${recipe.title}`,
    '',
    recipe.description || 'A PantryChef recipe suggestion.',
    '',
    `⏱ Prep: ${recipe.prepTime} min | Cook: ${recipe.cookTime} min | Total: ${recipe.totalTime} min`,
    `🍽 Serves: ${recipe.servings}`,
    `📊 Match: ${recipe.matchPercent}% ${recipe.matchType === 'full' ? '(Full Match)' : '(Partial Match)'}`,
    '',
    'Key ingredients:',
    ...keyIngredients,
    '',
    'Quick method:',
    ...quickSteps,
    missingSection,
    '',
    'Shared from PantryChef',
  ]
    .filter(Boolean)
    .join('\n');
}

function buildStepNarration(recipe: Recipe, stepIndex: number) {
  const step = recipe.steps[stepIndex];
  if (!step) return '';

  const parts = [
    `Step ${step.stepNumber}. ${step.title}.`,
    step.description,
    step.tip ? `Tip. ${step.tip}` : '',
  ];

  return parts.filter(Boolean).join(' ');
}

export default function RecipeDetailScreen() {
  const { recipe: recipeParam } = useLocalSearchParams<{ id: string; recipe: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('instructions');
  const [isSaved, setIsSaved] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [cookingStep, setCookingStep] = useState<number | null>(null);

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  const [speechEnabled, setSpeechEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSpeechPaused, setIsSpeechPaused] = useState(false);
  const [updatingPantry, setUpdatingPantry] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const cookingStepRef = useRef<number | null>(null);
  // Forward refs so voice-event callbacks can call functions defined later in the component
  const speakCurrentStepRef = useRef<(stepIndex: number) => Promise<void>>(async () => {});
  const pauseSpeakingRef = useRef<() => Promise<void>>(async () => {});
  const resumeSpeakingRef = useRef<() => Promise<void>>(async () => {});
  const handleCookedItRef = useRef<() => Promise<void>>(async () => {});
  const startListeningRef = useRef<() => Promise<void>>(async () => {});

  // Keep ref in sync with state so event handlers always see current step
  useEffect(() => {
    cookingStepRef.current = cookingStep;
  }, [cookingStep]);

  // ─── Voice command processing ────────────────────────────────────────────────
  useSpeechRecognitionEvent('result', (event) => {
    if (!event.isFinal) return;
    const transcript = event.results?.[0]?.transcript?.toLowerCase().trim() ?? '';
    if (!transcript) return;

    const step = cookingStepRef.current;
    if (step === null) return;

    if (
      transcript.includes('next') ||
      transcript.includes('forward') ||
      transcript.includes('continue')
    ) {
      void Speech.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setCookingStep((prev) => (prev !== null ? Math.min(prev + 1, 999) : prev));
    } else if (
      transcript.includes('previous') ||
      transcript.includes('back') ||
      transcript.includes('go back')
    ) {
      void Speech.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      setCookingStep((prev) => (prev !== null ? Math.max(prev - 1, 0) : prev));
    } else if (transcript.includes('repeat') || transcript.includes('again')) {
      void speakCurrentStepRef.current(step);
    } else if (transcript.includes('pause')) {
      void pauseSpeakingRef.current();
    } else if (transcript.includes('resume')) {
      void resumeSpeakingRef.current();
    } else if (transcript.includes('stop') || transcript.includes('quiet') || transcript.includes('mute')) {
      void Speech.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    } else if (
      transcript.includes('done') ||
      transcript.includes('finished') ||
      transcript.includes('cooked') ||
      transcript.includes('complete')
    ) {
      void handleCookedItRef.current();
    } else if (transcript.includes('read') || transcript.includes('play')) {
      void speakCurrentStepRef.current(step);
    }

    // Restart listening after processing a command
    void startListeningRef.current();
  });

  useSpeechRecognitionEvent('end', () => {
    // Auto-restart listening if cooking mode is active
    if (cookingStepRef.current !== null && isListening) {
      void startListeningRef.current();
    } else {
      setIsListening(false);
    }
  });

  useSpeechRecognitionEvent('error', () => {
    setIsListening(false);
  });

  useEffect(() => {
    if (recipeParam) {
      try {
        setRecipe(JSON.parse(recipeParam));
      } catch {
        Alert.alert('Error', 'Could not load recipe.');
      }
    }
  }, [recipeParam]);

  useEffect(() => {
    if (!user || !recipe) return;
    isRecipeSaved(user.uid, recipe.id).then((sid) => {
      setIsSaved(!!sid);
      setSavedId(sid);
    });
  }, [user, recipe]);

  useEffect(() => {
    if (cookingStep !== null) {
      activateKeepAwake();
    } else {
      deactivateKeepAwake();
      void Speech.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
      // Stop listening when leaving cooking mode
      if (isListening) {
        ExpoSpeechRecognitionModule?.stop();
        setIsListening(false);
      }
    }

    return () => {
      setIsSpeechPaused(false);
      deactivateKeepAwake();
    };
  }, [cookingStep]);

  useEffect(() => {
    return () => {
      void Speech.stop();
      setIsSpeechPaused(false);
      deactivateKeepAwake();
    };
  }, []);

  const heroImage = useMemo(() => (recipe ? getRecipeImage(recipe) : ''), [recipe]);

  const handleSaveToggle = async () => {
    if (!user || !recipe) return;

    try {
      if (isSaved && savedId) {
        await removeSavedRecipe(user.uid, savedId);
        setIsSaved(false);
        setSavedId(null);
      } else {
        const saved = await saveRecipe(user.uid, recipe);
        setIsSaved(true);
        setSavedId(saved.id);
      }
    } catch {
      Alert.alert('Error', 'Could not update saved recipe.');
    }
  };

  const handleShare = async () => {
    if (!recipe) return;

    try {
      await Share.share({
        title: recipe.title,
        message: buildShareMessage(recipe),
      });
    } catch {
      Alert.alert('Error', 'Could not share recipe.');
    }
  };

  const handleAddMissingToCart = async () => {
    if (!user || !recipe) return;

    try {
      const missing = recipe.ingredients.filter((i) => !i.inPantry);
      if (missing.length === 0) {
        Alert.alert('Nothing to shop', 'This recipe does not have any missing ingredients.');
        return;
      }

      let lists = await getShoppingLists(user.uid);
      let list = lists[0];
      if (!list) list = await createShoppingList(user.uid);

      for (const ing of missing) {
        await addItemToList(user.uid, list.id, list.items, {
          name: ing.name,
          quantity: ing.amount,
          category: 'Other',
          isChecked: false,
          recipeName: recipe.title,
        });
      }

      Alert.alert(
        'Added to Shopping List',
        `${missing.length} missing ingredient${missing.length !== 1 ? 's' : ''} added to your shopping list.`
      );
    } catch {
      Alert.alert('Error', 'Could not add items to shopping list.');
    }
  };

  const handleSubmitRating = async () => {
    if (!user || !recipe || userRating === 0) return;

    setSubmittingRating(true);
    try {
      const result = await addRating(user.uid, recipe.id, userRating, userComment);
      // Optimistically update the displayed rating in-screen
      setRecipe((prev) =>
        prev
          ? { ...prev, rating: result.newAverage, ratingCount: result.newCount }
          : prev
      );
      setShowRatingModal(false);
      setUserRating(0);
      setUserComment('');
      Alert.alert('Thanks!', `Your ${userRating}★ rating has been saved.`);
    } catch (error) {
      const message =
        __DEV__ && error instanceof Error
          ? error.message
          : 'Could not submit rating.';
      Alert.alert('Error', message);
    } finally {
      setSubmittingRating(false);
    }
  };

  const startListening = async () => {
    if (!ExpoSpeechRecognitionModule) {
      Alert.alert(
        'Voice Commands Unavailable',
        'STT requires a development or production build — not available in Expo Go.'
      );
      return;
    }
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) return;
      ExpoSpeechRecognitionModule.start({
        lang: 'en-US',
        interimResults: false,
        continuous: false,
      });
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  };

  const stopListening = () => {
    try {
      ExpoSpeechRecognitionModule?.stop();
    } catch {}
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      void startListening();
    }
  };

  // Keep forward-ref in sync for voice event handlers
  startListeningRef.current = startListening;

  const speakCurrentStep = useCallback(async (stepIndex: number) => {
    if (!recipe || !speechEnabled) return;

    const narration = buildStepNarration(recipe, stepIndex);
    if (!narration) return;

    try {
      await Speech.stop();
      setIsSpeaking(true);
      setIsSpeechPaused(false);

      Speech.speak(narration, {
        rate: 0.95,
        pitch: 1.0,
        onDone: () => {
          setIsSpeaking(false);
          setIsSpeechPaused(false);
        },
        onStopped: () => {
          setIsSpeaking(false);
          setIsSpeechPaused(false);
        },
        onError: () => {
          setIsSpeaking(false);
          setIsSpeechPaused(false);
        },
      });
    } catch {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    }
  }, [recipe, speechEnabled]);

  // Keep forward-refs in sync so voice event handlers (defined before these fns) stay current
  useEffect(() => { speakCurrentStepRef.current = speakCurrentStep; }, [speakCurrentStep]);

  const handlePauseSpeaking = async () => {
    if (!isSpeaking || isSpeechPaused) return;

    try {
      if (Platform.OS === 'android') {
        await Speech.stop();
        setIsSpeaking(false);
        setIsSpeechPaused(false);
        Alert.alert('Pause unavailable', 'Voice pause is not supported on Android yet. Tap Read Step to start this step again.');
        return;
      }

      await Speech.pause();
      setIsSpeechPaused(true);
    } catch {
      setIsSpeechPaused(false);
    }
  };

  const handleResumeSpeaking = async () => {
    if (cookingStep === null || !speechEnabled) return;

    try {
      if (Platform.OS === 'android') {
        await speakCurrentStep(cookingStep);
        return;
      }

      await Speech.resume();
      setIsSpeaking(true);
      setIsSpeechPaused(false);
    } catch {
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    }
  };

  useEffect(() => { pauseSpeakingRef.current = handlePauseSpeaking; }, [handlePauseSpeaking]);
  useEffect(() => { resumeSpeakingRef.current = handleResumeSpeaking; }, [handleResumeSpeaking]);

  const handleStopSpeaking = async () => {
    try {
      await Speech.stop();
      setIsSpeaking(false);
      setIsSpeechPaused(false);
    } catch {}
  };

  const toggleSpeechEnabled = async () => {
    const nextValue = !speechEnabled;
    setSpeechEnabled(nextValue);

    if (!nextValue) {
      await handleStopSpeaking();
    }
  };

  const handleCookedIt = async () => {
    if (!user || !recipe) return;

    setUpdatingPantry(true);
    // Stop listening before async ops
    if (isListening) stopListening();

    try {
      const result = await updatePantryAfterCooking(user.uid, recipe);

      // Persist cooked record and any skipped ingredients for Needs Review
      await markRecipeAsCooked(user.uid, recipe.id, recipe.title, result.skippedIngredients);
      if (result.skippedIngredients.length > 0) {
        await addNeedsReviewItems(user.uid, recipe.id, recipe.title, result.skippedIngredients);
      }

      setCookingStep(null);

      const summary = [
        result.updatedItems > 0
          ? `${result.updatedItems} pantry item${result.updatedItems !== 1 ? 's' : ''} updated`
          : '',
        result.removedItems > 0
          ? `${result.removedItems} pantry item${result.removedItems !== 1 ? 's' : ''} removed`
          : '',
        result.skippedIngredients.length > 0
          ? `${result.skippedIngredients.length} ingredient${result.skippedIngredients.length !== 1 ? 's' : ''} couldn't be auto-adjusted — check Needs Review in your pantry`
          : '',
      ]
        .filter(Boolean)
        .join('\n');

      Alert.alert('Cooked It! 🍳', summary || 'Your pantry has been updated.');
      setShowRatingModal(true);
    } catch {
      Alert.alert('Error', 'Could not update pantry after cooking.');
    } finally {
      setUpdatingPantry(false);
    }
  };

  // Keep forward-ref in sync for voice event handlers
  handleCookedItRef.current = handleCookedIt;

  if (!recipe) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </SafeAreaView>
    );
  }

  const inPantryCount = recipe.ingredients.filter((i) => i.inPantry).length;
  const totalSteps = recipe.steps.length;

  if (cookingStep !== null) {
    const step = recipe.steps[cookingStep];

    return (
      <SafeAreaView style={styles.cookingMode}>
        <Animated.View entering={FadeIn.duration(250)} style={styles.cookingHeader}>
          <TouchableOpacity onPress={() => setCookingStep(null)}>
            <Text style={styles.cookingExit}>✕ Exit</Text>
          </TouchableOpacity>
          <Text style={styles.cookingProgress}>
            {cookingStep + 1} / {totalSteps}
          </Text>
          <View style={styles.cookingHeaderRight}>
            <TouchableOpacity
              onPress={toggleListening}
              style={[styles.voiceToggle, isListening && styles.voiceToggleActive]}
            >
              <Text style={styles.voiceToggleText}>{isListening ? '🎙️' : '🎤'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void toggleSpeechEnabled()}
              style={styles.voiceToggle}
            >
              <Text style={styles.voiceToggleText}>{speechEnabled ? '🔊' : '🔈'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {isListening && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.listeningBanner}>
            <Text style={styles.listeningBannerText}>
              🎙️ Listening… say "next", "previous", "repeat", or "finished"
            </Text>
          </Animated.View>
        )}

        <View style={styles.cookingProgressBar}>
          <View
            style={[
              styles.cookingProgressFill,
              { width: `${((cookingStep + 1) / totalSteps) * 100}%` },
            ]}
          />
        </View>

        <View style={styles.voiceActions}>
          <TouchableOpacity
            style={styles.voiceActionBtn}
            onPress={() => speakCurrentStep(cookingStep)}
            disabled={!speechEnabled}
          >
            <Text style={styles.voiceActionText}>▶ Read Step</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voiceActionBtn, styles.voiceActionBtnSecondary]}
            onPress={isSpeechPaused ? handleResumeSpeaking : handlePauseSpeaking}
            disabled={!speechEnabled || (!isSpeaking && !isSpeechPaused)}
          >
            <Text style={styles.voiceActionTextSecondary}>
              {isSpeechPaused ? '▶ Resume Voice' : isSpeaking ? '⏸ Pause Voice' : 'Pause Voice'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.voiceActionBtn, styles.voiceActionBtnSecondary]}
            onPress={handleStopSpeaking}
            disabled={!speechEnabled || (!isSpeaking && !isSpeechPaused)}
          >
            <Text style={styles.voiceActionTextSecondary}>■ Stop Voice</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.cookingContent}>
          <View style={styles.stepNumber}>
            <Text style={styles.stepNumberText}>{step.stepNumber}</Text>
          </View>

          <Text style={styles.stepTitle}>{step.title}</Text>

          {!!step.duration && (
            <View style={styles.stepDuration}>
              <Text style={styles.stepDurationText}>⏱ {step.duration}</Text>
            </View>
          )}

          <Text style={styles.stepDescription}>{step.description}</Text>

          {!!step.tip && (
            <View style={styles.stepTip}>
              <Text style={styles.stepTipLabel}>💡 Pro Tip</Text>
              <Text style={styles.stepTipText}>{step.tip}</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.cookingNav}>
            <TouchableOpacity
              style={[styles.cookingNavBtn, styles.cookingNavPrev, cookingStep === 0 && styles.disabledBtn]}
            onPress={() => {
              void Speech.stop();
              setIsSpeaking(false);
              setIsSpeechPaused(false);
              setCookingStep(Math.max(0, cookingStep - 1));
            }}
            disabled={cookingStep === 0}
          >
            <Text style={styles.cookingNavPrevText}>← Previous</Text>
          </TouchableOpacity>

          {cookingStep < totalSteps - 1 ? (
            <TouchableOpacity
              style={[styles.cookingNavBtn, styles.cookingNavNext]}
              onPress={() => {
                void Speech.stop();
                setIsSpeaking(false);
                setIsSpeechPaused(false);
                setCookingStep(cookingStep + 1);
              }}
            >
              <Text style={styles.cookingNavNextText}>Next Step →</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.cookingNavBtn, styles.cookingDoneBtn, updatingPantry && styles.disabledBtn]}
              onPress={handleCookedIt}
              disabled={updatingPantry}
            >
              {updatingPantry ? (
                <ActivityIndicator color={Colors.onPrimary} />
              ) : (
                <Text style={styles.cookingNavNextText}>🍽 Cooked It</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroContainer}>
          <Image source={{ uri: heroImage }} style={styles.heroImage} />
          <View style={styles.heroOverlayShade} />

          <SafeAreaView style={styles.heroTopSafe}>
            <View style={styles.heroHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.heroIconBtn}>
                <Text style={styles.heroBackText}>←</Text>
              </TouchableOpacity>

              <View style={styles.heroActions}>
                <TouchableOpacity onPress={handleSaveToggle} style={styles.heroIconBtn}>
                  <Text style={styles.heroIconEmoji}>{isSaved ? '❤️' : '🤍'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleShare} style={styles.heroIconBtn}>
                  <Text style={styles.heroIconEmoji}>↗️</Text>
                </TouchableOpacity>
              </View>
            </View>
          </SafeAreaView>

          <View style={styles.heroInfoWrap}>
            <View style={styles.heroBadgeRow}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>
                  {recipe.matchType === 'full' ? '✅ Full Match' : '🛒 Partial Match'}
                </Text>
              </View>
              <View style={[styles.heroBadge, styles.heroBadgeMuted]}>
                <Text style={styles.heroBadgeMutedText}>⏱ {recipe.totalTime} min</Text>
              </View>
            </View>

            <Text style={styles.heroTitle}>{recipe.title}</Text>
            {!!recipe.description && <Text style={styles.heroDescription}>{recipe.description}</Text>}
          </View>
        </View>

        <Animated.View entering={FadeInUp.delay(80).springify()} style={styles.contentCard}>
          <Animated.View entering={FadeInDown.delay(120).springify()} style={styles.metaGrid}>
            {[
              { icon: '⏰', label: 'Prep', value: `${recipe.prepTime} min` },
              { icon: '🍳', label: 'Cook', value: `${recipe.cookTime} min` },
              { icon: '👥', label: 'Serves', value: `${recipe.servings}` },
              { icon: '🥄', label: 'Difficulty', value: recipe.difficulty },
            ].map(({ icon, label, value }, i) => (
              <Animated.View key={label} entering={ZoomIn.delay(140 + i * 50).springify()} style={styles.metaCell}>
                <Text style={styles.metaCellIcon}>{icon}</Text>
                <Text style={styles.metaCellLabel}>{label}</Text>
                <Text style={styles.metaCellValue}>{value}</Text>
              </Animated.View>
            ))}
          </Animated.View>

          {recipe.missingIngredients.length > 0 && (
            <TouchableOpacity style={styles.missingCTA} onPress={handleAddMissingToCart}>
              <View style={{ flex: 1 }}>
                <Text style={styles.missingCTATitle}>
                  Missing {recipe.missingIngredients.length} ingredient{recipe.missingIngredients.length > 1 ? 's' : ''}
                </Text>
                <Text style={styles.missingCTAText}>
                  {recipe.missingIngredients.slice(0, 3).join(', ')}
                  {recipe.missingIngredients.length > 3 ? '…' : ''}
                </Text>
              </View>
              <Text style={styles.missingCTABtn}>+ Add to List</Text>
            </TouchableOpacity>
          )}

          <View style={styles.tabs}>
            {(['ingredients', 'instructions', 'reviews'] as Tab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'instructions'
                    ? 'How to Cook'
                    : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'ingredients' && (
            <Animated.View entering={FadeIn.duration(180)} style={styles.tabContent}>
              <Text style={styles.pantrySummary}>
                ✅ {inPantryCount} of {recipe.ingredients.length} ingredients in your pantry
              </Text>

              {recipe.ingredients.map((ing, i) => (
                <Animated.View
                  key={`${ing.name}-${i}`}
                  entering={FadeInDown.delay(i * 40).springify()}
                  style={[styles.ingredientRow, ing.inPantry && styles.ingredientRowInPantry]}
                >
                  <View style={[styles.ingredientCheck, ing.inPantry && styles.ingredientCheckDone]}>
                    {ing.inPantry && <Text style={styles.checkText}>✓</Text>}
                  </View>

                  <View style={styles.ingredientInfo}>
                    <Text style={[styles.ingredientName, !ing.inPantry && styles.ingredientNameMuted]}>
                      {ing.name}
                    </Text>
                    <Text style={styles.ingredientAmount}>{ing.amount}</Text>
                  </View>

                  {ing.inPantry ? (
                    <View style={styles.inPantryTag}>
                      <Text style={styles.inPantryTagText}>In Pantry</Text>
                    </View>
                  ) : (
                    <View style={styles.missingTag}>
                      <Text style={styles.missingTagText}>Missing</Text>
                    </View>
                  )}
                </Animated.View>
              ))}
            </Animated.View>
          )}

          {activeTab === 'instructions' && (
            <Animated.View entering={FadeIn.duration(180)} style={styles.tabContent}>
              {recipe.steps.length > 0 ? (
                <>
                  {recipe.steps.map((step, i) => (
                    <Animated.View
                      key={`${step.stepNumber}-${i}`}
                      entering={FadeInDown.delay(i * 50).springify()}
                      style={styles.stepRow}
                    >
                      <View style={[styles.stepNum, i === 0 && styles.stepNumActive]}>
                        <Text style={[styles.stepNumText, i === 0 && { color: Colors.onPrimary }]}>
                          {step.stepNumber}
                        </Text>
                      </View>

                      <View style={styles.stepContent}>
                        <Text style={styles.stepTitleSmall}>{step.title}</Text>
                        <Text style={styles.stepDescSmall}>{step.description}</Text>
                        {!!step.tip && <Text style={styles.stepTipSmall}>💡 {step.tip}</Text>}
                      </View>
                    </Animated.View>
                  ))}

                  <TouchableOpacity style={styles.startCookingBtn} onPress={() => setCookingStep(0)}>
                    <Text style={styles.startCookingText}>▶ Start Cooking Mode</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyInstructions}>
                  <Text style={styles.emptyInstructionsTitle}>No cooking steps yet</Text>
                  <Text style={styles.emptyInstructionsText}>
                    This recipe did not include step-by-step instructions.
                  </Text>
                </View>
              )}
            </Animated.View>
          )}

          {activeTab === 'reviews' && (
            <Animated.View entering={FadeIn.duration(180)} style={styles.tabContent}>
              <View style={styles.ratingOverview}>
                <Text style={styles.ratingBig}>{recipe.rating?.toFixed(1) ?? '—'}</Text>
                <StarRating value={Math.round(recipe.rating ?? 0)} />
                <Text style={styles.ratingCount}>{recipe.ratingCount ?? 0} reviews</Text>
              </View>

              <TouchableOpacity
                style={styles.leaveReviewBtn}
                onPress={() => setShowRatingModal(true)}
              >
                <Text style={styles.leaveReviewText}>✏️ Write a Review</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </Animated.View>

        <View style={{ height: 110 }} />
      </ScrollView>

      <Animated.View entering={FadeInUp.delay(250).springify()} style={styles.bottomBar}>
        <SafeAreaView style={styles.bottomBarInner}>
          <TouchableOpacity
            style={styles.bottomSecondaryBtn}
            onPress={() => setActiveTab('ingredients')}
          >
            <Text style={styles.bottomSecondaryBtnText}>🥕 Ingredients</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomPrimaryBtn}
            onPress={() => {
              if (recipe.steps.length > 0) {
                setActiveTab('instructions');
                setCookingStep(0);
                return;
              }
              setActiveTab('instructions');
            }}
          >
            <Text style={styles.bottomPrimaryBtnText}>
              {recipe.steps.length > 0 ? '▶ Cook Now' : '📖 How to Cook'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Animated.View>

      <Modal
        visible={showRatingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRatingModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowRatingModal(false)}>
          <Pressable style={styles.ratingModal} onPress={(e) => e.stopPropagation()}>

            <Text style={styles.ratingModalTitle}>Rate This Recipe</Text>
            <Text style={styles.ratingModalSub}>{recipe.title}</Text>

            <View style={styles.starRow}>
              <StarRating value={userRating} onChange={setUserRating} size={36} />
            </View>

            <TextInput
              style={styles.commentInput}
              value={userComment}
              onChangeText={setUserComment}
              placeholder="Share your thoughts... (optional)"
              placeholderTextColor={Colors.outline}
              multiline
              numberOfLines={3}
            />

            <View style={styles.ratingModalBtns}>
              <TouchableOpacity
                style={styles.ratingCancelBtn}
                onPress={() => setShowRatingModal(false)}
              >
                <Text style={styles.ratingCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.ratingSubmitBtn, userRating === 0 && styles.disabledBtn]}
                onPress={handleSubmitRating}
                disabled={userRating === 0 || submittingRating}
              >
                {submittingRating ? (
                  <ActivityIndicator color={Colors.onPrimary} />
                ) : (
                  <Text style={styles.ratingSubmitText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },

  heroContainer: {
    position: 'relative',
    height: 340,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroOverlayShade: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(12, 34, 20, 0.42)',
  },
  heroTopSafe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroIconBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroBackText: {
    color: Colors.white,
    fontSize: 20,
    fontWeight: '800',
  },
  heroIconEmoji: {
    fontSize: 20,
  },
  heroInfoWrap: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  heroBadge: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  heroBadgeMuted: {
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  heroBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },
  heroBadgeMutedText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.white,
    lineHeight: 34,
  },
  heroDescription: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    lineHeight: 20,
  },

  contentCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -20,
    padding: 22,
  },

  metaGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  metaCell: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  metaCellIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  metaCellLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
    letterSpacing: 0.6,
  },
  metaCellValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onSurface,
    marginTop: 4,
    textAlign: 'center',
  },

  missingCTA: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  missingCTATitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },
  missingCTAText: {
    fontSize: 12,
    color: Colors.secondary,
    marginTop: 3,
  },
  missingCTABtn: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.secondary,
  },

  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1.5,
    borderBottomColor: Colors.outlineVariant,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2.5,
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: Colors.primary,
    fontWeight: '800',
  },
  tabContent: {
    gap: 10,
  },

  pantrySummary: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    marginBottom: 8,
  },

  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 16,
    backgroundColor: Colors.surfaceContainerLow,
  },
  ingredientRowInPantry: {
    backgroundColor: Colors.surface,
  },
  ingredientCheck: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ingredientCheckDone: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkText: {
    color: Colors.onPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  ingredientNameMuted: {
    opacity: 0.78,
  },
  ingredientAmount: {
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  inPantryTag: {
    backgroundColor: Colors.primaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  inPantryTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onPrimaryContainer,
  },
  missingTag: {
    backgroundColor: Colors.secondaryContainer,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  missingTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.onSecondaryContainer,
  },

  stepRow: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 18,
  },
  stepNum: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepNumActive: {
    backgroundColor: Colors.primary,
  },
  stepNumText: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  stepContent: {
    flex: 1,
  },
  stepTitleSmall: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 6,
  },
  stepDescSmall: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  stepTipSmall: {
    fontSize: 12,
    color: Colors.tertiary,
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyInstructions: {
    backgroundColor: Colors.surfaceVariant,
    borderRadius: 18,
    padding: 18,
  },
  emptyInstructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.onSurface,
    marginBottom: 6,
  },
  emptyInstructionsText: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },

  startCookingBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  startCookingText: {
    color: Colors.onPrimary,
    fontWeight: '700',
    fontSize: 16,
  },

  ratingOverview: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 18,
  },
  ratingBig: {
    fontSize: 52,
    fontWeight: '800',
    color: Colors.onSurface,
  },
  ratingCount: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  leaveReviewBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  leaveReviewText: {
    color: Colors.primary,
    fontWeight: '700',
    fontSize: 15,
  },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: Colors.onSurface,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 8,
  },
  bottomBarInner: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  bottomSecondaryBtn: {
    flex: 1,
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomSecondaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  bottomPrimaryBtn: {
    flex: 1.3,
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bottomPrimaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.onPrimary,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  ratingModal: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
  },
  ratingModalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 4,
  },
  ratingModalSub: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    marginBottom: 20,
  },
  starRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  commentInput: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    color: Colors.onSurface,
    minHeight: 80,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    textAlignVertical: 'top',
    marginBottom: 20,
  },
  ratingModalBtns: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  ratingCancelText: {
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
    fontSize: 15,
  },
  ratingSubmitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  ratingSubmitText: {
    fontWeight: '700',
    color: Colors.onPrimary,
    fontSize: 15,
  },

  cookingMode: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  cookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
  },
  cookingExit: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.onSurface,
  },
  cookingProgress: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.onSurfaceVariant,
  },
  cookingHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  voiceToggle: {
    minWidth: 40,
    alignItems: 'center',
    padding: 4,
    borderRadius: 8,
  },
  voiceToggleActive: {
    backgroundColor: Colors.primaryContainer ?? 'rgba(76,175,80,0.18)',
  },
  voiceToggleText: {
    fontSize: 20,
  },
  listeningBanner: {
    marginHorizontal: 20,
    marginBottom: 6,
    backgroundColor: Colors.primaryContainer ?? 'rgba(76,175,80,0.15)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  listeningBannerText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  cookingProgressBar: {
    height: 4,
    backgroundColor: Colors.surfaceContainerLow,
    marginHorizontal: 20,
    borderRadius: 4,
    overflow: 'hidden',
  },
  cookingProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
  },
  voiceActions: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  voiceActionBtn: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  voiceActionBtnSecondary: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  voiceActionText: {
    color: Colors.onPrimaryContainer,
    fontWeight: '700',
    fontSize: 13,
  },
  voiceActionTextSecondary: {
    color: Colors.onSurface,
    fontWeight: '700',
    fontSize: 13,
  },
  cookingContent: {
    padding: 28,
    flexGrow: 1,
  },
  stepNumber: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepNumberText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.onPrimary,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.onSurface,
    marginBottom: 12,
  },
  stepDuration: {
    backgroundColor: Colors.surfaceContainerLow,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  stepDurationText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.onSurfaceVariant,
  },
  stepDescription: {
    fontSize: 18,
    color: Colors.onSurface,
    lineHeight: 28,
  },
  stepTip: {
    backgroundColor: Colors.tertiaryContainer,
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  stepTipLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.onTertiaryContainer,
    marginBottom: 4,
  },
  stepTipText: {
    fontSize: 14,
    color: Colors.onTertiaryContainer,
    lineHeight: 20,
  },
  cookingNav: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  cookingNavBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
  },
  cookingNavPrev: {
    backgroundColor: Colors.surfaceContainerLow,
  },
  cookingNavNext: {
    backgroundColor: Colors.primary,
  },
  cookingDoneBtn: {
    backgroundColor: Colors.primary,
  },
  cookingNavPrevText: {
    fontWeight: '700',
    color: Colors.onSurface,
    fontSize: 15,
  },
  cookingNavNextText: {
    fontWeight: '800',
    color: Colors.onPrimary,
    fontSize: 15,
  },

  disabledBtn: {
    opacity: 0.55,
  },
});
