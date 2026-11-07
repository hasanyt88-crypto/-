import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';

export default function LoginScreen() {
  const { currentUser, login, isLoading } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.primary }]}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (currentUser) return <Redirect href="/(tabs)" />;

  const handleLogin = () => {
    if (!name.trim() || !password.trim()) {
      Alert.alert('تنبيه', 'يرجى إدخال الاسم وكلمة المرور');
      return;
    }
    setSubmitting(true);
    const success = login(name.trim(), password.trim());
    setSubmitting(false);
    if (!success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('خطأ في الدخول', 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#ea580c', '#c2410c']}
        style={[styles.header, { paddingTop: insets.top + 40 }]}
      >
        <View style={styles.logoCircle}>
          <Text style={styles.logoLetter}>H</Text>
        </View>
        <Text style={styles.brandName}>HETAR Pro</Text>
        <Text style={styles.brandTagline}>نظام الزيارات الميدانية</Text>
      </LinearGradient>

      <ScrollView
        style={[styles.body, { backgroundColor: colors.background }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40, paddingHorizontal: 24, paddingTop: 32 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>تسجيل الدخول</Text>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <Feather name="user" size={18} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="اسم المستخدم"
              placeholderTextColor={colors.mutedForeground}
              value={name}
              onChangeText={setName}
              textAlign="right"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputWrapper, { borderColor: colors.border, backgroundColor: colors.background }]}>
            <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.inputIcon}>
              <Feather name={showPass ? 'eye-off' : 'eye'} size={18} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TextInput
              style={[styles.input, { color: colors.foreground }]}
              placeholder="كلمة المرور"
              placeholderTextColor={colors.mutedForeground}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              textAlign="right"
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity
            style={[styles.loginBtn, { backgroundColor: colors.primary, opacity: submitting ? 0.8 : 1 }]}
            onPress={handleLogin}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.loginBtnText}>دخول</Text>
            }
          </TouchableOpacity>
        </View>

        <Text style={[styles.versionText, { color: colors.mutedForeground }]}>
          HETAR v2.3.0 • 2026
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { alignItems: 'center', paddingBottom: 48 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  logoLetter: { fontSize: 44, fontWeight: '900' as const, color: '#fff' },
  brandName: { fontSize: 30, fontWeight: '900' as const, color: '#fff', letterSpacing: -0.5 },
  brandTagline: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 6 },
  body: { flex: 1, marginTop: -24, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden' },
  card: {
    borderRadius: 20, padding: 24, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  cardTitle: { fontSize: 20, fontWeight: '800' as const, marginBottom: 20, textAlign: 'center' },
  inputWrapper: {
    flexDirection: 'row-reverse', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 14, marginBottom: 12, overflow: 'hidden',
  },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 14, paddingHorizontal: 4, fontSize: 15 },
  loginBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  loginBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' as const },
  versionText: { textAlign: 'center', fontSize: 11, marginTop: 28 },
});
