import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useState, useRef } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Colors } from '@/constants/Colors';
import { DetectedIngredient } from '@/types';
import { detectIngredientsFromPhoto } from '@/services/claude';
import { addDetectedIngredients } from '@/services/pantryService';
import { useAuth } from '@/hooks/useAuth';

const CATEGORY_LABELS = {
  fridge: '🧊 Fridge',
  pantry: '📦 Pantry',
  freezer: '❄️ Freezer',
  spices: '🌶️ Spices',
  other: '🍽️ Other',
};

export default function ScanScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [base64Image, setBase64Image] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<DetectedIngredient[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'capture' | 'review' | 'done'>('capture');

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to scan your ingredients.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      await processImage(result.assets[0].uri);
    }
  };

  const processImage = async (uri: string) => {
    setImageUri(uri);
    setDetecting(true);
    setStep('review');

    try {
      // Resize for API — keep quality high (0.92) so labels/text are readable
      const context = ImageManipulator.manipulate(uri);
      const image = await context.resize({ width: 1280 }).renderAsync();
      const manipulated = await image.saveAsync({
        compress: 0.92,
        format: SaveFormat.JPEG,
        base64: true,
      });

      if (!manipulated.base64) throw new Error('Failed to convert image');

      const ingredients = await detectIngredientsFromPhoto(manipulated.base64, 'image/jpeg');
      setDetected(ingredients);
      // Select all by default
      setSelected(new Set(ingredients.map((_, i) => i)));
    } catch (err: unknown) {
      Alert.alert(
        'Detection Failed',
        err instanceof Error ? err.message : 'Could not analyze the image. Please try again.',
        [{ text: 'OK', onPress: () => { setStep('capture'); setImageUri(null); } }]
      );
    } finally {
      setDetecting(false);
    }
  };

  const toggleSelection = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const toSave = detected.filter((_, i) => selected.has(i));
      if (toSave.length === 0) {
        Alert.alert('No Items Selected', 'Please select at least one ingredient to add.');
        setSaving(false);
        return;
      }
      await addDetectedIngredients(user.uid, toSave);
      setStep('done');
    } catch (err: unknown) {
      Alert.alert('Save Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan Ingredients</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* STEP: Capture */}
        {step === 'capture' && (
          <View style={styles.captureStep}>
            <View style={styles.cameraFrame}>
              <Text style={styles.cameraIcon}>📷</Text>
              <Text style={styles.cameraTitle}>Take a Photo</Text>
              <Text style={styles.cameraSubtitle}>
                Snap your fridge, pantry shelf, or any food items and Claude AI will identify the ingredients for you.
              </Text>
            </View>

            <View style={styles.tips}>
              {[
                '💡 Good lighting helps detection accuracy',
                '📸 Include as many items as possible in frame',
                '🔍 Labels and packaging are recognized too',
              ].map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity style={styles.primaryBtn} onPress={pickFromCamera}>
              <Text style={styles.primaryBtnText}>📷  Open Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={pickFromLibrary}>
              <Text style={styles.secondaryBtnText}>🖼  Choose from Library</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* STEP: Review */}
        {step === 'review' && (
          <View>
            {imageUri && (
              <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
            )}

            {detecting ? (
              <View style={styles.detectingCard}>
                <ActivityIndicator color={Colors.primary} size="large" />
                <Text style={styles.detectingTitle}>Analyzing with Claude AI...</Text>
                <Text style={styles.detectingSub}>
                  Identifying ingredients, quantities, and categories from your photo.
                </Text>
              </View>
            ) : (
              <View>
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsTitle}>
                    {detected.length} ingredient{detected.length !== 1 ? 's' : ''} detected
                  </Text>
                  <TouchableOpacity
                    onPress={() => setSelected(
                      selected.size === detected.length
                        ? new Set()
                        : new Set(detected.map((_, i) => i))
                    )}
                  >
                    <Text style={styles.selectAllText}>
                      {selected.size === detected.length ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {detected.map((item, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.detectedItem,
                      selected.has(index) && styles.detectedItemSelected,
                    ]}
                    onPress={() => toggleSelection(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.checkbox,
                      selected.has(index) && styles.checkboxChecked,
                    ]}>
                      {selected.has(index) && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                    <View style={styles.detectedInfo}>
                      <Text style={styles.detectedName}>{item.name}</Text>
                      <Text style={styles.detectedMeta}>
                        {CATEGORY_LABELS[item.category]}
                        {item.quantity ? ` • ${item.quantity}` : ''}
                        {` • ${Math.round(item.confidence * 100)}% confidence`}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity
                  style={[styles.primaryBtn, { marginTop: 20 }]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator color={Colors.onPrimary} />
                  ) : (
                    <Text style={styles.primaryBtnText}>
                      Add {selected.size} Item{selected.size !== 1 ? 's' : ''} to Pantry
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.secondaryBtn}
                  onPress={() => { setStep('capture'); setImageUri(null); setDetected([]); }}
                >
                  <Text style={styles.secondaryBtnText}>Scan Another Photo</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* STEP: Done */}
        {step === 'done' && (
          <View style={styles.doneStep}>
            <Text style={styles.doneEmoji}>🎉</Text>
            <Text style={styles.doneTitle}>Pantry Updated!</Text>
            <Text style={styles.doneSub}>
              {selected.size} ingredient{selected.size !== 1 ? 's have' : ' has'} been added to your pantry.
              Check out recipes you can make now!
            </Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.replace('/(tabs)/recipes')}
            >
              <Text style={styles.primaryBtnText}>🍳  View Recipe Ideas</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.replace('/(tabs)')}
            >
              <Text style={styles.secondaryBtnText}>Go to Pantry</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 18, color: Colors.onSurface },
  headerTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 40 },
  captureStep: { gap: 16 },
  cameraFrame: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.outlineVariant,
    marginBottom: 8,
  },
  cameraIcon: { fontSize: 56, marginBottom: 16 },
  cameraTitle: { fontSize: 22, fontWeight: '800', color: Colors.onSurface, marginBottom: 8 },
  cameraSubtitle: {
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  tips: { gap: 8 },
  tipRow: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tipText: { fontSize: 13, color: Colors.onSurface },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  primaryBtnText: { color: Colors.onPrimary, fontWeight: '700', fontSize: 16 },
  secondaryBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    marginTop: 8,
  },
  secondaryBtnText: { color: Colors.onSurface, fontWeight: '600', fontSize: 15 },
  previewImage: { width: '100%', height: 220, borderRadius: 20, marginBottom: 16 },
  detectingCard: { alignItems: 'center', paddingVertical: 48, gap: 16 },
  detectingTitle: { fontSize: 18, fontWeight: '700', color: Colors.onSurface },
  detectingSub: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultsTitle: { fontSize: 17, fontWeight: '700', color: Colors.onSurface },
  selectAllText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  detectedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
  },
  detectedItemSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.surfaceContainerLow,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: Colors.onPrimary, fontSize: 14, fontWeight: '700' },
  detectedInfo: { flex: 1 },
  detectedName: { fontSize: 15, fontWeight: '700', color: Colors.onSurface },
  detectedMeta: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },
  doneStep: { alignItems: 'center', paddingTop: 40, gap: 16 },
  doneEmoji: { fontSize: 72 },
  doneTitle: { fontSize: 28, fontWeight: '800', color: Colors.onSurface },
  doneSub: {
    fontSize: 15,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});
