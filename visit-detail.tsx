import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, Linking, Alert, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { visibleVisits, deleteVisit } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const visit = visibleVisits.find(v => v.id === id);

  if (!visit) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <Feather name="alert-circle" size={40} color={colors.mutedForeground} />
        <Text style={[styles.notFoundText, { color: colors.mutedForeground }]}>الزيارة غير موجودة</Text>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backLink, { backgroundColor: colors.primary }]}>
          <Text style={{ color: '#fff', fontWeight: '700' as const }}>رجوع</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const productsWithOrder = visit.products.filter(p => p.order > 0);

  const sendWhatsAppOrder = () => {
    if (productsWithOrder.length === 0) {
      Alert.alert('تنبيه', 'لا توجد طلبات لإرسالها');
      return;
    }
    const text = `*طلب بضاعة - ${visit.outletName}*\nمرجع الطلب: ${visit.orderRefId ?? visit.refId}\nرقم المنفذ: ${visit.outletPhone ?? 'غير مسجل'}\nطريقة الشراء: ${visit.agent ?? 'غير محددة'}\nالمنطقة: ${visit.area}\n\nالطلبات:\n${productsWithOrder.map(p => `- ${p.name} — الكمية المطلوبة: ${p.order}`).join('\n')}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const sendWhatsAppReport = () => {
    const text = `*تقرير زيارة HETAR*\nالرقم: ${visit.refId}\nالعميل: ${visit.outletName}${visit.outletPhone ? `\nرقم الجوال: ${visit.outletPhone}` : ''}${visit.customerName ? `\nاسم العميل: ${visit.customerName}` : ''}${visit.customerNumber ? `\nرقم العميل: ${visit.customerNumber}` : ''}\nالمندوب: ${visit.userName}\nالتاريخ: ${visit.dateDisplay}\nالمنطقة: ${visit.province} / ${visit.area}${visit.gps ? `\nالموقع: ${visit.gps.lat.toFixed(4)}, ${visit.gps.lng.toFixed(4)}` : ''}${visit.notes ? `\nملاحظات: ${visit.notes}` : ''}`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  const openInGoogleMaps = () => {
    if (!visit.gps) {
      Alert.alert('الموقع غير متوفر', 'لم يتم تسجيل GPS لهذه الزيارة.');
      return;
    }
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${visit.gps.lat},${visit.gps.lng}`);
  };

  const handleDelete = () => {
    Alert.alert('تأكيد الحذف', 'هل تريد حذف هذه الزيارة نهائياً؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          deleteVisit(visit.id);
          router.back();
        },
      },
    ]);
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{visit.outletName}</Text>
          <View style={[styles.refBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.refText, { color: colors.mutedForeground }]}>{visit.refId}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleDelete} style={styles.iconBtn}>
          <Feather name="trash-2" size={20} color={colors.destructive} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 14 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Info */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>معلومات الزيارة</Text>
          {[
            { icon: 'calendar' as const, label: 'التاريخ', value: visit.dateDisplay },
            ...(visit.orderRefId ? [{ icon: 'file-text' as const, label: 'مرجع الطلب', value: visit.orderRefId }] : []),
            { icon: 'user' as const, label: 'المندوب', value: visit.userName },
            ...(visit.outletPhone ? [{ icon: 'phone' as const, label: 'رقم الجوال', value: visit.outletPhone }] : []),
            { icon: 'tag' as const, label: 'نوع العميل', value: visit.outletType },
            ...(visit.customerName ? [{ icon: 'user' as const, label: 'اسم العميل', value: visit.customerName }] : []),
            ...(visit.customerNumber ? [{ icon: 'hash' as const, label: 'رقم العميل', value: visit.customerNumber }] : []),
            { icon: 'map' as const, label: 'المحافظة', value: visit.province },
            { icon: 'map-pin' as const, label: 'المنطقة', value: visit.area },
            ...(visit.agent ? [{ icon: 'briefcase' as const, label: 'طريقة الشراء', value: visit.agent }] : []),
          ].map((row, i) => (
            <View key={i} style={[styles.infoRow, { borderBottomColor: colors.border }]}>
              <Text style={[styles.infoValue, { color: colors.foreground }]}>{row.value}</Text>
              <View style={styles.infoLeft}>
                <Feather name={row.icon} size={14} color={colors.mutedForeground} />
                <Text style={[styles.infoLabel, { color: colors.mutedForeground }]}>{row.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* GPS */}
        {visit.gps && (
          <View style={[styles.gpsCard, { backgroundColor: colors.successBg, borderColor: colors.success }]}>
            <TouchableOpacity onPress={openInGoogleMaps} style={styles.mapButton}>
              <Feather name="map" size={16} color="#fff" />
              <Text style={styles.mapButtonText}>فتح في خرائط Google</Text>
            </TouchableOpacity>
            <View style={styles.gpsValue}>
              <Feather name="navigation" size={16} color={colors.success} />
              <Text style={[styles.gpsText, { color: colors.success }]}>
                {`${visit.gps.lat.toFixed(6)}, ${visit.gps.lng.toFixed(6)}`}
              </Text>
            </View>
          </View>
        )}

        {/* Products */}
        {visit.products.length > 0 && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>المنتجات</Text>
            <View style={styles.productsHeader}>
              <Text style={[styles.prodColHeader, { color: colors.mutedForeground, flex: 2 }]}>الصنف</Text>
              <Text style={[styles.prodColHeader, { color: colors.mutedForeground }]}>المخزون</Text>
              <Text style={[styles.prodColHeader, { color: colors.primary }]}>الطلب</Text>
            </View>
            {visit.products.map((p, i) => (
              <View key={i} style={[styles.productRow, { borderBottomColor: colors.border, backgroundColor: p.order > 0 ? colors.accent : 'transparent' }]}>
                <Text style={[styles.prodName, { color: colors.foreground }]} numberOfLines={2}>{p.name}</Text>
                <Text style={[styles.prodNum, { color: colors.mutedForeground }]}>{p.stock}</Text>
                <Text style={[styles.prodNum, { color: p.order > 0 ? colors.primary : colors.mutedForeground, fontWeight: p.order > 0 ? '800' : '400' }]}>{p.order}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Photo */}
        {visit.photo && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>صورة العميل</Text>
            <Image source={{ uri: visit.photo }} style={styles.photo} resizeMode="cover" />
          </View>
        )}

        {/* Signature */}
        {visit.signature && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>توقيع العميل</Text>
            <View style={[styles.sigBox, { borderColor: colors.border }]}>
              <Svg width="100%" height={120}>
                {visit.signature.split('M ').filter(Boolean).map((seg, i) => (
                  <Path
                    key={i}
                    d={`M ${seg}`}
                    stroke={colors.foreground}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </Svg>
            </View>
          </View>
        )}

        {/* Notes */}
        {visit.notes && (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.cardTitle, { color: colors.foreground }]}>الملاحظات</Text>
            <Text style={[styles.notesText, { color: colors.foreground }]}>{visit.notes}</Text>
          </View>
        )}

        {/* WhatsApp Actions */}
        <View style={styles.waRow}>
          <TouchableOpacity
            style={[styles.waBtn, { backgroundColor: '#22c55e' }]}
            onPress={sendWhatsAppOrder}
            activeOpacity={0.85}
          >
            <Feather name="message-circle" size={18} color="#fff" />
            <Text style={styles.waBtnText}>إرسال الطلب</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.waBtn, { backgroundColor: '#3b82f6' }]}
            onPress={sendWhatsAppReport}
            activeOpacity={0.85}
          >
            <Feather name="send" size={18} color="#fff" />
            <Text style={styles.waBtnText}>تقرير الزيارة</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  notFoundText: { fontSize: 16, marginTop: 12 },
  backLink: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerCenter: { alignItems: 'center', gap: 4, flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: '800' as const, textAlign: 'center' },
  refBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  refText: { fontSize: 11, fontWeight: '700' as const },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  card: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  cardTitle: { fontSize: 15, fontWeight: '800' as const, textAlign: 'right', marginBottom: 12 },
  infoRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  infoLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  infoLabel: { fontSize: 13, fontWeight: '600' as const },
  infoValue: { fontSize: 13, fontWeight: '700' as const, textAlign: 'right' },
  gpsCard: { borderRadius: 14, padding: 14, gap: 10, borderWidth: 1 },
  gpsValue: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  gpsText: { fontSize: 13, fontWeight: '700' as const, flex: 1, textAlign: 'right' },
  mapButton: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, backgroundColor: '#2563eb', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  mapButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' as const },
  productsHeader: { flexDirection: 'row-reverse', paddingBottom: 8, marginBottom: 4 },
  prodColHeader: { fontSize: 11, fontWeight: '700' as const, textAlign: 'center', flex: 1 },
  productRow: { flexDirection: 'row-reverse', paddingVertical: 10, borderBottomWidth: 1, borderRadius: 8, paddingHorizontal: 6, marginBottom: 2 },
  prodName: { flex: 2, fontSize: 12, fontWeight: '600' as const, textAlign: 'right' },
  prodNum: { flex: 1, fontSize: 13, textAlign: 'center' },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  sigBox: { borderWidth: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: '#fafafa' },
  notesText: { fontSize: 14, textAlign: 'right', lineHeight: 22 },
  waRow: { flexDirection: 'row-reverse', gap: 12 },
  waBtn: { flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, borderRadius: 16 },
  waBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const },
});
