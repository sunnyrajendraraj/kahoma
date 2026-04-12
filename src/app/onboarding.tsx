import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  heading: string;
  body: string;
  buttonText: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    heading: 'Some stories wait\na lifetime.',
    body: 'The ones you never told anyone. About people who shaped you. Moments that changed everything. They deserve to be heard.',
    buttonText: 'I have a story',
  },
  {
    id: '2',
    heading: 'Just speak.\nWe understand.',
    body: '• Speak in any language — Hindi, English, or both\n• We listen, understand, and ask gently if needed\n• Your words become a beautifully written book',
    buttonText: 'How does it work?',
  },
  {
    id: '3',
    heading: 'Your stories\nstay yours.',
    body: 'Everything you share is completely private. Your voice recordings are encrypted and never shared. Your book belongs to you alone.',
    buttonText: 'Begin my story',
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      // Complete onboarding
      await AsyncStorage.setItem('kahoma_onboarded', 'true');
      router.replace('/(tabs)');
    }
  };

  const renderItem = ({ item }: { item: OnboardingSlide }) => (
    <View style={[styles.slide, { width }]}>
      <View style={styles.slideContent}>
        <Text style={styles.heading}>{item.heading}</Text>
        <Text style={styles.body}>{item.body}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Dot indicators */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex && styles.dotActive,
            ]}
          />
        ))}
      </View>

      {/* Action button */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={handleNext}
          activeOpacity={0.7}
        >
          <Text style={styles.buttonText}>
            {slides[currentIndex].buttonText}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  slide: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  slideContent: {
    alignItems: 'flex-start',
  },
  heading: {
    fontSize: 34,
    fontWeight: '700',
    color: '#C9933A',
    lineHeight: 42,
    marginBottom: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  body: {
    fontSize: 16,
    color: '#F5EDD8',
    lineHeight: 26,
    opacity: 0.8,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#6b5c4e',
  },
  dotActive: {
    backgroundColor: '#C9933A',
    width: 24,
  },
  buttonContainer: {
    paddingHorizontal: 36,
    paddingBottom: 48,
  },
  button: {
    backgroundColor: '#C9933A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#050508',
    fontSize: 16,
    fontWeight: '700',
  },
});
