import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Alert, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import * as Updates from 'expo-updates';
import * as FileSystemLegacy from 'expo-file-system/legacy';
import { shareVisitsExcel, shareVisitsPdf } from '@/lib/export';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'مدير النظام', SUPERVISOR: 'مشرف', REP: 'مندوب' };

async function tryExportData(exportData: () => string) {
  try {
    const Sharing = await import('expo-sharing');
    const json = exportData();
    const uri = (FileSystemLegacy.documentDirectory ?? '') + `HETAR_Backup_${Date.now()}.json`;
    await FileSystemLegacy.writeAsStringAsync(uri, json, { encoding: FileSystemLegacy.EncodingType.UTF8 });
    const available = await Sharing.default.isAvailableAsync();
    if (available) {
      await Sharing.default.shareAsync(uri, { mimeType: 'application/json' });
    } else {
      Alert.alert('تصدير البيانات', 'تم حفظ نسخة البيانات بنجاح');
    }
  } catch {
    Alert.alert('خطأ', 'تعذّر تصدير البيانات');
  }
}

async function tryImportData(importData: (json: string) => boolean) {
  try {
    const DocumentPicker = await import('expo-document-picker');
    const result = await DocumentPicker.default.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
    if (!result.canceled && result.assets?.[0]) {
      const content = await FileSystemLegacy.readAsStringAsync(result.assets[0].uri);
      const ok = importData(content);
      Alert.alert(ok ? 'تم بنجاح' : 'خطأ', ok ? 'تم استيراد البيانات بنجاح' : 'الملف غير صالح');
    }
  } catch {
    Alert.alert('خطأ', 'تعذّر استيراد البيانات');
  }
}

export default function SettingsScreen() {
  const { currentUser, data, visibleVisits, logout, exportData, importData, restoreAutoBackup, clearAllData } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [checkingUpdate, setCheckingUpdate] = useState(false);

  if (!currentUser) return <Redirect href="/login" />;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const checkForUpdates = async () => {
    setCheckingUpdate(true);
    try {
      if (__DEV__) {
        Alert.alert('التحديثات التلقائية', 'تعمل التحديثات التلقائية عند استخدام النسخة المنشورة من التطبيق.');
        return;
      }
      const update = await Updates.checkForUpdateAsync();
      if (update.isAvailable) {
        Alert.alert('يوجد تحديث جديد', 'سيتم تحميل التحديث الآن...', [
          {
            text: 'تحديث الآن', onPress: async () => {
              await Updates.fetchUpdateAsync();
              await Updates.reloadAsync();
            },
          },
          { text: 'لاحقاً', style: 'cancel' },
        ]);
      } else {
        Alert.alert('التحديثات التلقائية', 'التطبيق يعمل بأحدث إصدار ✓');
      }
    } catch {
      Alert.alert('التحديثات التلقائية', 'تعذّر التحقق الآن، لكن التطبيق يعمل بأحدث إصدار معروف ✓');
    } finally {
      setCheckingUpdate(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('تسجيل الخروج', 'هل تريد تسجيل الخروج؟', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'خروج', style: 'destructive', onPress: () => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); logout(); } },
    ]);
  };

  const handleClear = () => {
    Alert.alert('حذف كافة البيانات', 'سيتم حذف جميع الزيارات والبيانات. هذا الإجراء لا يمكن التراجع عنه!', [
      { text: 'إلغاء', style: 'cancel' },
      { text: 'حذف', style: 'destructive', onPress: async () => { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning); await clearAllData(); } },
    ]);
  };

  const handleAutoRestore = async () => {
    const restored = await restoreAutoBackup();
    Alert.alert(
      restored ? 'تمت الاستعادة' : 'لا توجد نسخة تلقائية',
      restored ? 'تمت استعادة آخر نسخة محفوظة تلقائيًا.' : 'لم يتم العثور على نسخة تلقائية محفوظة.',
    );
  };

  const handleShare = async (action: () => Promise<void>, success: string) => {
    try {
      await action();
      Alert.alert('تم بنجاح', success);
    } catch (error) {
      Alert.alert('تعذّر التصدير', error instanceof Error ? error.message : 'تعذّر إنشاء الملف أو مشاركته');
    }
  };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ paddingBottom: Platform.OS === 'web' ? 84 + 34 : 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>الإعدادات</Text>
      </View>

      <View style={{ padding: 20, gap: 20 }}>
        {/* User Card */}
        <View style={[styles.userCard, { backgroundColor: colors.primary }]}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarLetter}>{currentUser.name.charAt(0)}</Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{currentUser.name}</Text>
            <Text style={styles.userRole}>{ROLE_LABELS[currentUser.role]}</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* التحديثات التلقائية */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>التحديثات التلقائية</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.infoBg, borderColor: colors.info }]}>
            <Feather name="zap" size={16} color={colors.info} />
            <Text style={[styles.infoText, { color: colors.info }]}>
              تصل تحديثات التطبيق تلقائياً عبر الإنترنت دون الحاجة إلى تنزيل التطبيق من جديد
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={checkForUpdates}
            disabled={checkingUpdate}
            activeOpacity={0.85}
          >
            {checkingUpdate ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="refresh-cw" size={18} color={colors.primary} />
            )}
            <Text style={[styles.rowText, { color: colors.foreground }]}>التحقق من التحديثات</Text>
            <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>

        {/* Backup */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>حفظ واستعادة البيانات</Text>
          <View style={[styles.groupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <TouchableOpacity
              style={[styles.groupRow, { borderBottomColor: colors.border, borderBottomWidth: 1 }]}
              onPress={() => tryExportData(exportData)}
              activeOpacity={0.85}
            >
              <Feather name="download" size={18} color={colors.success} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>حفظ نسخة من البيانات</Text>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.groupRow}
              onPress={() => tryImportData(importData)}
              activeOpacity={0.85}
            >
              <Feather name="upload" size={18} color={colors.info} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>استعادة البيانات من ملف</Text>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.groupRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}
              onPress={handleAutoRestore}
              activeOpacity={0.85}
            >
              <Feather name="rotate-ccw" size={18} color={colors.warning} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>استعادة النسخة التلقائية</Text>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.groupRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}
              onPress={() => handleShare(() => shareVisitsExcel({ ...data, visits: visibleVisits }), 'تم تجهيز ملف Excel متوافق مع البيانات.')}
              activeOpacity={0.85}
            >
              <Feather name="grid" size={18} color={colors.success} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>تصدير Excel</Text>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.groupRow, { borderTopColor: colors.border, borderTopWidth: 1 }]}
              onPress={() => handleShare(() => shareVisitsPdf(visibleVisits), 'تم تجهيز ملف PDF للزيارات.')}
              activeOpacity={0.85}
            >
              <Feather name="file-text" size={18} color={colors.destructive} />
              <Text style={[styles.rowText, { color: colors.foreground }]}>تصدير PDF</Text>
              <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View>
          <Text style={[styles.sectionTitle, { color: colors.destructive }]}>حذف البيانات</Text>
          <TouchableOpacity
            style={[styles.row, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}
            onPress={handleClear}
            activeOpacity={0.85}
          >
            <Feather name="trash-2" size={18} color={colors.destructive} />
            <Text style={[styles.rowText, { color: colors.destructive }]}>حذف جميع البيانات</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={[styles.aboutCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.aboutTitle, { color: colors.foreground }]}>HETAR Pro</Text>
          <Text style={[styles.aboutVersion, { color: colors.mutedForeground }]}>الإصدار 2.3.0</Text>
          <Text style={[styles.aboutYear, { color: colors.mutedForeground }]}>نظام الزيارات الميدانية • 2026</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' as const, textAlign: 'right' },
  sectionTitle: { fontSize: 14, fontWeight: '700' as const, textAlign: 'right', marginBottom: 10 },
  userCard: { borderRadius: 20, padding: 20, flexDirection: 'row-reverse', alignItems: 'center', gap: 14 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 24, fontWeight: '900' as const, color: '#fff' },
  userInfo: { flex: 1 },
  userName: { fontSize: 18, fontWeight: '800' as const, color: '#fff', textAlign: 'right' },
  userRole: { fontSize: 13, color: 'rgba(255,255,255,0.8)', textAlign: 'right', marginTop: 2 },
  logoutBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  infoCard: { borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 10, marginBottom: 10, borderWidth: 1 },
  infoText: { flex: 1, fontSize: 13, fontWeight: '600' as const, textAlign: 'right' },
  row: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 14, borderWidth: 1, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  rowText: { flex: 1, fontSize: 14, fontWeight: '700' as const, textAlign: 'right' },
  groupCard: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  groupRow: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', padding: 16, gap: 12 },
  aboutCard: { borderRadius: 16, borderWidth: 1, padding: 20, alignItems: 'center', gap: 4 },
  aboutTitle: { fontSize: 18, fontWeight: '900' as const },
  aboutVersion: { fontSize: 13, fontWeight: '600' as const },
  aboutYear: { fontSize: 12 },
});
