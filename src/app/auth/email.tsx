import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../store/auth';

export default function EmailAuthScreen() {
  const [email, setEmail] = useState('');
  const { sendOTP, loading } = useAuthStore();
  const router = useRouter();

  const handleSendCode = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      Alert.alert('Invalid email', 'Please enter a valid email address.');
      return;
    }

    try {
      await sendOTP(trimmed);
      router.push({ pathname: '/auth/verify', params: { email: trimmed } });
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to send code. Please try again.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.brand}>Kahoma</Text>
          <Text style={styles.tagline}>Your story. Your words. Your book.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Your email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="name@example.com"
            placeholderTextColor="#6b5c4e"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSendCode}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Sending...' : 'Send me a code'}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          We&apos;ll send you a one-time code to sign in.{'\n'}
          No password needed.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050508',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 48,
  },
  brand: {
    fontSize: 42,
    fontWeight: '700',
    color: '#C9933A',
    marginBottom: 8,
    // Using system serif as closest to Cormorant Garamond on native
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  tagline: {
    fontSize: 16,
    color: '#6b5c4e',
    fontStyle: 'italic',
  },
  form: {
    marginBottom: 32,
  },
  label: {
    fontSize: 13,
    color: '#F5EDD8',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F0D0A',
    borderWidth: 1,
    borderColor: 'rgba(201, 147, 58, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#F5EDD8',
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#C9933A',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#050508',
    fontSize: 16,
    fontWeight: '700',
  },
  footer: {
    color: '#6b5c4e',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 20,
  },
});
