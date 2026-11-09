import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  FlatList, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp, Visit } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const ROLE_LABELS: Record<string, string> = { ADMIN: 'مدير النظام', SUPERVISOR: 'مشرف', REP: 'مندوب' };
const ROLE_COLORS: Record<string, string> = { ADMIN: '#fee2e2', SUPERVISOR: '#dbeafe', REP: '#dcfce7' };
const ROLE_TEXT_COLORS: Record<string, string> = { ADMIN: '#b91c1c', SUPERVISOR: '#1e40af', REP: '#166534' };
const OUTLET_TYPE_ICONS: Record<string, string> = { صيدلية: 'shopping-bag', عيادة: 'activity', مستشفى: 'heart', مخزن: 'box' };

function VisitCard({ visit, onPress }: { visit: Visit; onPress: () => void }) {
  const colors = useColors();
  const totalOrders = visit.products.reduce((s, p) => s + (p.order || 0), 0);
  const icon = (OUTLET_TYPE_ICONS[visit.outletType] ?? 'map-pin') as any;
  return (
    <TouchableOpacity
      style={[styles.visitCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.visitIconBox, { backgroundColor: colors.accent }]}>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      <View style={styles.visitInfo}>
        <Text style={[styles.visitOutlet, { color: colors.foreground }]} numberOfLines={1}>{visit.outletName}</Text>
        <Text style={[styles.visitMeta, { color: colors.mutedForeground }]}>{visit.area} • {visit.dateDisplay}</Text>
      </View>
      <View style={styles.visitRight}>
        {totalOrders > 0 && (
          <View style={[styles.orderBadge, { backgroundColor: colors.primary }]}>
            <Text style={styles.orderBadgeText}>{totalOrders}</Text>
          </View>
        )}
        <Feather name="chevron-left" size={16} color={colors.mutedForeground} />
      </View>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { currentUser, data, visibleVisits, isLoading } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!isLoading && !currentUser) return <Redirect href="/login" />;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);

  const todayVisits = useMemo(
    () => visibleVisits.filter(v => v.timestamp >= today),
    [visibleVisits, today]
  );
  const todayOrders = useMemo(
    () => todayVisits.reduce((s, v) => s + v.products.reduce((ps, p) => ps + (p.order || 0), 0), 0),
    [todayVisits]
  );

  const recentVisits = useMemo(() => visibleVisits.slice(0, 8), [visibleVisits]);

  // Area stats for bar chart
  const areaStats = useMemo(() => {
    const map: Record<string, number> = {};
    visibleVisits.forEach(v => { map[v.area] = (map[v.area] ?? 0) + 1; });
    return Object.entries(map).slice(0, 5).sort((a, b) => b[1] - a[1]);
  }, [visibleVisits]);
  const maxAreaCount = Math.max(...areaStats.map(([, c]) => c), 1);

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={{ paddingTop: topInset, paddingBottom: Platform.OS === 'web' ? 84 + 34 : 90 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: 20, paddingBottom: 20 }]}>
        <View>
          <Text style={[styles.greeting, { color: colors.mutedForeground }]}>مرحباً،</Text>
          <Text style={[styles.userName, { color: colors.foreground }]}>{currentUser?.name ?? ''}</Text>
        </View>
        <View style={[styles.roleBadge, { backgroundColor: ROLE_COLORS[currentUser?.role ?? 'REP'] }]}>
          <Text style={[styles.roleText, { color: ROLE_TEXT_COLORS[currentUser?.role ?? 'REP'] }]}>
            {ROLE_LABELS[currentUser?.role ?? 'REP']}
          </Text>
        </View>
      </View>

      {/* Stats Row */}
      <View style={[styles.statsRow, { paddingHorizontal: 20 }]}>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="map-pin" size={20} color={colors.primary} />
          <Text style={[styles.statNum, { color: colors.foreground }]}>{todayVisits.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>زيارات اليوم</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="package" size={20} color={colors.info} />
          <Text style={[styles.statNum, { color: colors.foreground }]}>{todayOrders}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>طلبات اليوم</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Feather name="archive" size={20} color={colors.success} />
          <Text style={[styles.statNum, { color: colors.foreground }]}>{visibleVisits.length}</Text>
          <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>إجمالي الزيارات</Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={[styles.quickRow, { paddingHorizontal: 20, marginTop: 16 }]}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: colors.primary }]}
          onPress={() => router.push('/new-visit')}
          activeOpacity={0.85}
        >
          <Feather name="plus-circle" size={22} color="#fff" />
          <Text style={styles.quickBtnText}>زيارة جديدة</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtnOutline, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push('/(tabs)/history')}
          activeOpacity={0.85}
        >
          <Feather name="list" size={22} color={colors.primary} />
          <Text style={[styles.quickBtnOutlineText, { color: colors.primary }]}>عرض الزيارات</Text>
        </TouchableOpacity>
      </View>

      {/* Area Distribution (ADMIN only) */}
      {currentUser?.role === 'ADMIN' && areaStats.length > 0 && (
        <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>توزيع الزيارات حسب المنطقة</Text>
          <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {areaStats.map(([area, count]) => (
              <View key={area} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: colors.mutedForeground }]} numberOfLines={1}>{area}</Text>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { width: `${(count / maxAreaCount) * 100}%` as any, backgroundColor: colors.primary }]} />
                </View>
                <Text style={[styles.barValue, { color: colors.foreground }]}>{count}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recent Visits */}
      <View style={{ paddingHorizontal: 20, marginTop: 24 }}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>آخر الزيارات</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/history')}>
            <Text style={[styles.seeAll, { color: colors.primary }]}>عرض الكل</Text>
          </TouchableOpacity>
        </View>
        {recentVisits.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Feather name="map" size={32} color={colors.mutedForeground} />
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد زيارات</Text>
            <Text style={[styles.emptySubText, { color: colors.mutedForeground }]}>ابدأ زيارة جديدة</Text>
          </View>
        ) : (
          recentVisits.map(visit => (
            <VisitCard
              key={visit.id}
              visit={visit}
              onPress={() => router.push({ pathname: '/visit-detail', params: { id: visit.id } })}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16 },
  greeting: { fontSize: 13, fontWeight: '500' as const, textAlign: 'right' },
  userName: { fontSize: 22, fontWeight: '900' as const, textAlign: 'right' },
  roleBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  roleText: { fontSize: 12, fontWeight: '800' as const },
  statsRow: { flexDirection: 'row-reverse', gap: 10 },
  statCard: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 16,
    borderWidth: 1, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  statNum: { fontSize: 26, fontWeight: '900' as const },
  statLabel: { fontSize: 10, fontWeight: '700' as const, textAlign: 'center' },
  quickRow: { flexDirection: 'row-reverse', gap: 10 },
  quickBtn: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16,
  },
  quickBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' as const },
  quickBtnOutline: {
    flex: 1, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 16, borderWidth: 1,
  },
  quickBtnOutlineText: { fontSize: 14, fontWeight: '800' as const },
  sectionTitle: { fontSize: 16, fontWeight: '800' as const, marginBottom: 12 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  seeAll: { fontSize: 13, fontWeight: '700' as const },
  chartCard: {
    borderRadius: 16, padding: 16, borderWidth: 1, gap: 10,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  barRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  barLabel: { width: 70, fontSize: 11, fontWeight: '600' as const, textAlign: 'right' },
  barTrack: { flex: 1, height: 8, backgroundColor: '#f1f5f9', borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 4 },
  barValue: { width: 24, fontSize: 12, fontWeight: '700' as const, textAlign: 'center' },
  visitCard: {
    flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 14,
    borderWidth: 1, marginBottom: 8, gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  visitIconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  visitInfo: { flex: 1 },
  visitOutlet: { fontSize: 14, fontWeight: '700' as const, textAlign: 'right' },
  visitMeta: { fontSize: 12, marginTop: 2, textAlign: 'right' },
  visitRight: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  orderBadge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  orderBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' as const },
  emptyState: {
    alignItems: 'center', padding: 32, borderRadius: 16, borderWidth: 1,
    gap: 8, borderStyle: 'dashed',
  },
  emptyText: { fontSize: 15, fontWeight: '700' as const },
  emptySubText: { fontSize: 12 },
});
