import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Alert, Linking, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp, Visit } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';

function VisitRow({ visit, onPress, onDelete }: { visit: Visit; onPress: () => void; onDelete: () => void }) {
  const colors = useColors();
  const totalOrders = visit.products.reduce((s, p) => s + (p.order || 0), 0);
  const productsWithOrder = visit.products.filter(p => p.order > 0);

  const sendWhatsApp = () => {
    const text = `*طلب بضاعة - ${visit.outletName}*\nمرجع الطلب: ${visit.orderRefId ?? visit.refId}\nرقم المنفذ: ${visit.outletPhone ?? 'غير مسجل'}\nطريقة الشراء: ${visit.agent ?? 'غير محددة'}\nالمنطقة: ${visit.area}${
      productsWithOrder.length > 0 ? `\n\nالطلبات:\n${productsWithOrder.map(p => `- ${p.name} — الكمية المطلوبة: ${p.order}`).join('\n')}` : ''
    }`;
    Linking.openURL(`https://wa.me/?text=${encodeURIComponent(text)}`);
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={[styles.refBadge, { backgroundColor: colors.muted }]}>
            <Text style={[styles.refText, { color: colors.mutedForeground }]}>{visit.refId}</Text>
          </View>
          <Text style={[styles.dateText, { color: colors.mutedForeground }]}>{visit.dateDisplay}</Text>
        </View>
        <Text style={[styles.outletName, { color: colors.foreground }]} numberOfLines={1}>{visit.outletName}</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.cardBody}>
        <View style={styles.metaRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{visit.province} / {visit.area}</Text>
        </View>
        <View style={styles.metaRow}>
          <Feather name="user" size={12} color={colors.mutedForeground} />
          <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{visit.userName}</Text>
        </View>
        {visit.outletPhone ? (
          <View style={styles.metaRow}>
            <Feather name="phone" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{visit.outletPhone}</Text>
          </View>
        ) : null}
        {visit.customerName ? (
          <View style={styles.metaRow}>
            <Feather name="user" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>اسم العميل: {visit.customerName}</Text>
          </View>
        ) : null}
        {visit.customerNumber ? (
          <View style={styles.metaRow}>
            <Feather name="hash" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>رقم العميل: {visit.customerNumber}</Text>
          </View>
        ) : null}
        {visit.agent ? (
          <View style={styles.metaRow}>
            <Feather name="briefcase" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>طريقة الشراء: {visit.agent}</Text>
          </View>
        ) : null}
        {visit.gps ? (
          <View style={styles.metaRow}>
            <Feather name="navigation" size={12} color={colors.success} />
            <Text style={[styles.metaText, { color: colors.success }]}>تم تسجيل الموقع الحالي</Text>
          </View>
        ) : null}
      </View>

      {totalOrders > 0 && (
        <View style={[styles.ordersBox, { backgroundColor: colors.accent }]}>
          <Text style={[styles.ordersTitle, { color: colors.primary }]}>المنتجات المطلوبة ({productsWithOrder.length} منتج)</Text>
          {productsWithOrder.slice(0, 3).map((p, i) => (
            <Text key={i} style={[styles.orderItem, { color: colors.foreground }]}>• {p.name}: {p.order}</Text>
          ))}
          {productsWithOrder.length > 3 && (
            <Text style={[styles.orderItem, { color: colors.mutedForeground }]}>+{productsWithOrder.length - 3} منتجات أخرى</Text>
          )}
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted }]} onPress={sendWhatsApp}>
          <Feather name="message-circle" size={16} color={colors.success} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>واتساب</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.muted }]} onPress={onPress}>
          <Feather name="eye" size={16} color={colors.info} />
          <Text style={[styles.actionText, { color: colors.foreground }]}>تفاصيل</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#fef2f2' }]} onPress={onDelete}>
          <Feather name="trash-2" size={16} color={colors.destructive} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function HistoryScreen() {
  const { currentUser, visibleVisits, deleteVisit } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [search, setSearch] = useState('');

  if (!currentUser) return <Redirect href="/login" />;

  const searchIndex = useMemo(() => visibleVisits.map(visit => ({
    visit,
    text: `${visit.outletName} ${visit.outletPhone ?? ''} ${visit.customerName ?? ''} ${visit.customerNumber ?? ''} ${visit.area} ${visit.refId} ${visit.userName} ${visit.agent ?? ''}`.toLowerCase(),
  })), [visibleVisits]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visibleVisits;
    return searchIndex.filter(item => item.text.includes(q)).map(item => item.visit);
  }, [visibleVisits, search, searchIndex]);

  const handleDelete = (id: string) => {
    Alert.alert('تأكيد الحذف', 'هل تريد حذف هذه الزيارة؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          deleteVisit(id);
        },
      },
    ]);
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>سجل الزيارات</Text>
        <Text style={[styles.headerCount, { color: colors.mutedForeground }]}>{filtered.length} زيارة</Text>
      </View>

      {/* Search */}
      <View style={[styles.searchWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Feather name="search" size={16} color={colors.mutedForeground} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { color: colors.foreground }]}
          placeholder="ابحث باسم العميل أو المنطقة..."
          placeholderTextColor={colors.mutedForeground}
          value={search}
          onChangeText={setSearch}
          textAlign="right"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <VisitRow
            visit={item}
            onPress={() => router.push({ pathname: '/visit-detail', params: { id: item.id } })}
            onDelete={() => handleDelete(item.id)}
          />
        )}
        contentContainerStyle={{ padding: 16, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 90, gap: 12 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={40} color={colors.mutedForeground} />
            <Text style={[styles.emptyTitle, { color: colors.mutedForeground }]}>
              {search ? 'لا توجد نتائج' : 'لا توجد زيارات'}
            </Text>
            {!search && (
              <TouchableOpacity
                style={[styles.emptyBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push('/new-visit')}
              >
                <Text style={styles.emptyBtnText}>ابدأ الآن</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        scrollEnabled={true}
        showsVerticalScrollIndicator={false}
        initialNumToRender={12}
        maxToRenderPerBatch={12}
        windowSize={7}
        removeClippedSubviews={Platform.OS !== 'web'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' as const, textAlign: 'right' },
  headerCount: { fontSize: 13, textAlign: 'right', marginTop: 2 },
  searchWrapper: {
    flexDirection: 'row-reverse', alignItems: 'center',
    margin: 16, marginBottom: 0, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10,
  },
  searchIcon: { marginLeft: 8 },
  searchInput: { flex: 1, fontSize: 14, paddingVertical: 2 },
  card: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  cardHeader: { padding: 14, flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardHeaderLeft: { alignItems: 'flex-start', gap: 4 },
  refBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  refText: { fontSize: 10, fontWeight: '700' as const },
  dateText: { fontSize: 11 },
  outletName: { fontSize: 15, fontWeight: '800' as const, textAlign: 'right', flex: 1, marginLeft: 8 },
  divider: { height: 1, marginHorizontal: 14 },
  cardBody: { padding: 14, gap: 6 },
  metaRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12 },
  ordersBox: { marginHorizontal: 14, marginBottom: 14, borderRadius: 10, padding: 12, gap: 4 },
  ordersTitle: { fontSize: 12, fontWeight: '800' as const, marginBottom: 4 },
  orderItem: { fontSize: 12 },
  actions: { flexDirection: 'row-reverse', gap: 8, padding: 14, paddingTop: 0 },
  actionBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  actionText: { fontSize: 12, fontWeight: '700' as const },
  empty: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700' as const },
  emptyBtn: { marginTop: 8, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14 },
  emptyBtnText: { color: '#fff', fontWeight: '800' as const },
});
