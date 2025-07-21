import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, StyleSheet, Keyboard } from 'react-native';
import { Text, useTheme } from 'react-native-paper';

interface PINInputProps {
  value: string;
  onChangeText: (pin: string) => void;
  onSubmit?: () => void;
  error?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const PINInput: React.FC<PINInputProps> = ({
  value,
  onChangeText,
  onSubmit,
  error = false,
  disabled = false,
  autoFocus = true,
}) => {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      // Small delay to ensure component is mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [autoFocus]);

  useEffect(() => {
    if (value.length === 4 && onSubmit) {
      // Auto-submit when 4 digits are entered
      setTimeout(onSubmit, 100);
    }
  }, [value, onSubmit]);

  const handleChangeText = (text: string) => {
    // Only allow numeric input, max 4 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    onChangeText(numericText);
  };

  const handleFocus = () => {
    setFocused(true);
  };

  const handleBlur = () => {
    setFocused(false);
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      const isActive = focused && i === value.length;
      const isFilled = i < value.length;
      
      dots.push(
        <View
          key={i}
          style={[
            styles.dot,
            {
              borderColor: error 
                ? theme.colors.error
                : isActive 
                  ? theme.colors.primary 
                  : theme.colors.outline,
              backgroundColor: isFilled 
                ? (error ? theme.colors.error : theme.colors.primary)
                : 'transparent',
            }
          ]}
        >
          {isFilled && (
            <Text style={[styles.dotText, { color: theme.colors.onPrimary }]}>
              •
            </Text>
          )}
        </View>
      );
    }
    return dots;
  };

  return (
    <View style={styles.container}>
      {/* Hidden input for capturing keyboard input */}
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleFocus}
        onBlur={handleBlur}
        keyboardType="numeric"
        secureTextEntry
        maxLength={4}
        editable={!disabled}
        onSubmitEditing={onSubmit}
        returnKeyType="done"
      />
      
      {/* Visual PIN dots */}
      <View style={styles.dotsContainer}>
        {renderDots()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 1,
    height: 1,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  dot: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dotText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
});