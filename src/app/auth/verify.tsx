import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../store/auth';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

export default function VerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyOTP, sendOTP, loading } = useAuthStore();
  const router = useRouter();

  const [code, setCode] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  // Countdown timer for resend
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCodeChange = useCallback(
    (index: number, value: string) => {
      // Only accept digits
      const digit = value.replace(/\D/g, '').slice(-1);
      const newCode = [...code];
      newCode[index] = digit;
      setCode(newCode);

      if (digit && index < CODE_LENGTH - 1) {
        // Auto-advance to next input
        inputRefs.current[index + 1]?.focus();
      }

      // Auto-submit when all digits entered
      if (digit && index === CODE_LENGTH - 1) {
        const fullCode = newCode.join('');
        if (fullCode.length === CODE_LENGTH) {
          handleVerify(fullCode);
        }
      }
    },
    [code]
  );

  const handleKeyPress = useCallback(
    (index: number, key: string) => {
      if (key === 'Backspace' && !code[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
        const newCode = [...code];
        newCode[index - 1] = '';
        setCode(newCode);
      }
    },
    [code]
  );

  const handleVerify = async (fullCode: string) => {
    if (!email) return;
    try {
      await verifyOTP(email, fullCode);
      // Auth state change will handle navigation via _layout.tsx
    } catch (err) {
      Alert.alert(
        'Invalid code',
        err instanceof Error ? err.message : 'Please check the code and try again.'
      );
      setCode(Array(CODE_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || !email) return;
    try {
      await sendOTP(email);
      setCooldown(RESEND_COOLDOWN_SEC);
      Alert.alert('Code sent', `A new code has been sent to ${email}`);
    } catch (err) {
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Failed to resend code.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Enter your code</Text>
        <Text style={styles.subtitle}>
          We sent a 6-digit code to{'\n'}
          <Text style={styles.email}>{email}</Text>
        </Text>

        <View style={styles.codeContainer}>
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <TextInput
              key={index}
              ref={(ref) => {
                inputRefs.current[index] = ref;
              }}
              style={[
                styles.codeInput,
                code[index] ? styles.codeInputFilled : null,
              ]}
              value={code[index]}
              onChangeText={(value) => handleCodeChange(index, value)}
              onKeyPress={({ nativeEvent }) =>
                handleKeyPress(index, nativeEvent.key)
              }
              keyboardType="number-pad"
              maxLength={1}
              editable={!loading}
              autoFocus={index === 0}
            />
          ))}
        </View>

        {loading && (
          <Text style={styles.verifying}>Verifying...</Text>
        )}

        <TouchableOpacity
          style={styles.resendButton}
          onPress={handleResend}
          disabled={cooldown > 0}
        >
          <Text
            style={[
              styles.resendText,
              cooldown > 0 && styles.resendDisabled,
            ]}
          >
            {cooldown > 0
              ? `Resend code in ${cooldown}s`
              : 'Resend code'}
          </Text>
        </TouchableOpacity>
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
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
  },
  backText: {
    color: '#C9933A',
    fontSize: 16,
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F5EDD8',
    marginBottom: 12,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  subtitle: {
    fontSize: 15,
    color: '#6b5c4e',
    lineHeight: 22,
    marginBottom: 36,
  },
  email: {
    color: '#C9933A',
    fontWeight: '500',
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 32,
  },
  codeInput: {
    width: 46,
    height: 56,
    backgroundColor: '#0F0D0A',
    borderWidth: 1,
    borderColor: 'rgba(201, 147, 58, 0.2)',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
    color: '#F5EDD8',
  },
  codeInputFilled: {
    borderColor: '#C9933A',
  },
  verifying: {
    color: '#C9933A',
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 16,
  },
  resendButton: {
    alignSelf: 'center',
  },
  resendText: {
    color: '#C9933A',
    fontSize: 14,
  },
  resendDisabled: {
    color: '#6b5c4e',
  },
});
