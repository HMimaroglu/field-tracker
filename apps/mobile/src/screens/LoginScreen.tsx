import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  Text,
  Button,
  Card,
  TextInput,
  ActivityIndicator,
  useTheme,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '@/store/auth';
import { PINInput } from '@/components/PINInput';
import { databaseService } from '@/services/database';

export const LoginScreen: React.FC = () => {
  const theme = useTheme();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'employee_id' | 'pin'>('employee_id');

  useEffect(() => {
    // Initialize database when login screen loads
    databaseService.init().catch(console.error);
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Login Failed', error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  const handleEmployeeIdSubmit = () => {
    if (!employeeId.trim()) {
      Alert.alert('Error', 'Please enter your Employee ID');
      return;
    }
    setStep('pin');
  };

  const handlePINSubmit = async () => {
    if (pin.length !== 4) {
      Alert.alert('Error', 'Please enter your 4-digit PIN');
      return;
    }

    try {
      await login(employeeId.trim(), pin);
    } catch (loginError) {
      // Error is handled by the store and displayed via useEffect
      setPin(''); // Clear PIN on error
    }
  };

  const handleBack = () => {
    setStep('employee_id');
    setPin('');
    clearError();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Authenticating...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text variant="headlineLarge" style={styles.title}>
              Field Tracker
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Time tracking for field crews
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content style={styles.cardContent}>
              {step === 'employee_id' ? (
                <>
                  <Text variant="headlineSmall" style={styles.stepTitle}>
                    Enter Employee ID
                  </Text>
                  
                  <TextInput
                    mode="outlined"
                    label="Employee ID"
                    value={employeeId}
                    onChangeText={setEmployeeId}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    autoFocus
                    returnKeyType="next"
                    onSubmitEditing={handleEmployeeIdSubmit}
                    style={styles.input}
                  />
                  
                  <Button
                    mode="contained"
                    onPress={handleEmployeeIdSubmit}
                    disabled={!employeeId.trim()}
                    style={styles.button}
                  >
                    Next
                  </Button>
                </>
              ) : (
                <>
                  <Text variant="headlineSmall" style={styles.stepTitle}>
                    Enter PIN
                  </Text>
                  
                  <Text variant="bodyMedium" style={styles.employeeIdDisplay}>
                    {employeeId}
                  </Text>
                  
                  <View style={styles.pinContainer}>
                    <PINInput
                      value={pin}
                      onChangeText={setPin}
                      onSubmit={handlePINSubmit}
                      error={!!error}
                    />
                  </View>
                  
                  <View style={styles.buttonContainer}>
                    <Button
                      mode="outlined"
                      onPress={handleBack}
                      style={[styles.button, styles.backButton]}
                    >
                      Back
                    </Button>
                    
                    <Button
                      mode="contained"
                      onPress={handlePINSubmit}
                      disabled={pin.length !== 4}
                      style={[styles.button, styles.loginButton]}
                    >
                      Login
                    </Button>
                  </View>
                </>
              )}
            </Card.Content>
          </Card>

          <View style={styles.footer}>
            <Text variant="bodySmall" style={styles.footerText}>
              Field Tracker v1.0
            </Text>
            <Text variant="bodySmall" style={styles.footerText}>
              Works offline • Syncs when connected
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.7,
  },
  card: {
    marginBottom: 32,
  },
  cardContent: {
    padding: 24,
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: 24,
  },
  employeeIdDisplay: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  input: {
    marginBottom: 24,
  },
  pinContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
  },
  backButton: {},
  loginButton: {},
  footer: {
    alignItems: 'center',
    gap: 4,
  },
  footerText: {
    opacity: 0.6,
  },
  loadingText: {
    marginTop: 16,
    textAlign: 'center',
  },
});