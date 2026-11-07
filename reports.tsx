import React, { useMemo, useState } from 'react';
import { Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useApp, Visit } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import { shareVisitsExcel, shareVisitsPdf } from '@/lib/export';

type Period = { label: string; days: number };
const PERIODS: Period[] = [
  { label: '7 أيام', days: 7 },
  { label: '30 يومًا', days: 30 },
  { label: '90 يومًا', days: 90 },
];

function groupVisits(visits: Visit[], key: (visit: Visit) => string) {
  const counts: Record<string, number> = {};
  visits.forEach(visit => {
    const value = key(visit).trim() || 'غير محدد';
    counts[value] = (counts[value] ?? 0) + 1;
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

function ReportGroup({ title, icon, rows, total }: {
  title: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  rows: [string, number][];
  total: number;
}) {
  const colors = useColors();
  const max = Math.max(...rows.map(([, value]) => value), 1);
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.groupHeader}>
        <Text style={[styles.cardTitle, { color: colors.foreground }]}>{title}</Text>
        <Feather name={icon} size={18} color={colors.primary} />
      </View>
      {rows.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد بيانات للفترة</Text>
      ) : rows.slice(0, 8).map(([label, value]) => (
        <View key={label} style={styles.metricRow}>
          <Text style={[styles.metricValue, { color: colors.foreground }]}>{value}</Text>
          <View style={styles.metricMain}>
            <Text style={[styles.metricLabel, { color: colors.foreground }]}>{label}</Text>
            <View style={[styles.track, { backgroundColor: colors.muted }]}>
              <View style={[styles.fill, { backgroundColor: colors.primary, width: `${(value / max) * 100}%` as `${number}%` }]} />
            </View>
          </View>
        </View>
      ))}
      {rows.length > 8 && (
        <Text style={[styles.moreText, { color: colors.mutedForeground }]}>عرض أعلى 8 نتائج من أصل {rows.length}</Text>
      )}
      <Text style={[styles.totalText, { color: colors.mutedForeground }]}>إجمالي السجلات: {total}</Text>
    </View>
  );
}

export default function ReportsScreen() {
  const { currentUser, data, visibleVisits: scopedVisits } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [period, setPeriod] = useState(PERIODS[0]);

  if (!currentUser) return <Redirect href="/login" />;

  const visibleVisits = useMemo(() => {
    const since = Date.now() - period.days * 24 * 60 * 60 * 1000;
    return scopedVisits.filter(visit => visit.timestamp >= since);
  }, [scopedVisits, period.days]);

  const previousVisits = useMemo(() => {
    const end = Date.now() - period.days * 24 * 60 * 60 * 1000;
    const start = end - period.days * 24 * 60 * 60 * 1000;
    return scopedVisits.filter(visit => visit.timestamp >= start && visit.timestamp < end);
  }, [scopedVisits, period.days]);

  const visitsWithGps = visibleVisits.filter(visit => !!visit.gps).length;
  const presenceRate = visibleVisits.length ? Math.round((visitsWithGps / visibleVisits.length) * 100) : 0;
  const orders = visibleVisits.reduce((sum, visit) => sum + visit.products.reduce((total, product) => total + (product.order || 0), 0), 0);
  const previousOrders = previousVisits.reduce((sum, visit) => sum + visit.products.reduce((total, product) => total + (product.order || 0), 0), 0);
  const visitChange = previousVisits.length ? Math.round(((visibleVisits.length - previousVisits.length) / previousVisits.length) * 100) : 0;

  const supervisorIds = useMemo(
    () => new Set(data.users.filter(user => user.role === 'SUPERVISOR').map(user => user.id)),
    [data.users],
  );
  const repIds = useMemo(
    () => new Set(data.users.filter(user => user.role === 'REP').map(user => user.id)),
    [data.users],
  );
  const bySupervisor = groupVisits(visibleVisits.filter(visit => supervisorIds.has(visit.userId)), visit => visit.userName);
  const byRep = groupVisits(visibleVisits.filter(visit => repIds.has(visit.userId)), visit => visit.userName);
  const byArea = groupVisits(visibleVisits, visit => visit.area);
  const byAgent = groupVisits(visibleVisits, visit => visit.agent ?? 'غير محددة');
  const byProduct = (() => {
    const counts: Record<string, number> = {};
    visibleVisits.forEach(visit => visit.products.forEach(product => {
      counts[product.name] = (counts[product.name] ?? 0) + (product.order || 0);
    }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  })();

  const share = async (action: () => Promise<void>) => {
    try {
      await action();
      Alert.alert('تم بنجاح', 'تم تجهيز التقرير للمشاركة.');
    } catch (error) {
      Alert.alert('تعذّر التصدير', error instanceof Error ? error.message : 'تعذّر إنشاء التقرير');
    }
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>لوحة التقارير</Text>
        <View style={styles.iconButton} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100, gap: 14 }} showsVerticalScrollIndicator={false}>
        <View style={styles.periodRow}>
          {PERIODS.map(item => (
            <TouchableOpacity
              key={item.days}
              onPress={() => setPeriod(item)}
              style={[styles.periodButton, { backgroundColor: period.days === item.days ? colors.primary : colors.card, borderColor: colors.border }]}
            >
              <Text style={{ color: period.days === item.days ? '#fff' : colors.foreground, fontWeight: '700' as const }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsRow}>
          {[
            ['الزيارات', visibleVisits.length, 'map-pin'],
            ['الطلبات', orders, 'package'],
            ['التواجد', `${presenceRate}%`, 'navigation'],
          ].map(([label, value, icon]) => (
            <View key={String(label)} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name={icon as React.ComponentProps<typeof Feather>['name']} size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.foreground }]}>{value}</Text>
              <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{label}</Text>
            </View>
          ))}
        </View>

        <View style={[styles.comparisonCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.foreground }]}>مقارنة الفترات</Text>
          <Text style={[styles.comparisonText, { color: colors.mutedForeground }]}>
            الفترة الحالية: {visibleVisits.length} زيارة و{orders} طلب — الفترة السابقة: {previousVisits.length} زيارة و{previousOrders} طلب
          </Text>
          <Text style={[styles.changeText, { color: visitChange >= 0 ? colors.success : colors.destructive }]}>
            {visitChange >= 0 ? 'زيادة' : 'انخفاض'} الزيارات: {Math.abs(visitChange)}%
          </Text>
        </View>

        <ReportGroup title="التحليل حسب المشرف" icon="user" rows={bySupervisor} total={bySupervisor.reduce((sum, [, value]) => sum + value, 0)} />
        <ReportGroup title="التحليل حسب المندوب" icon="user-check" rows={byRep} total={byRep.reduce((sum, [, value]) => sum + value, 0)} />
        <ReportGroup title="التحليل حسب المنطقة" icon="map-pin" rows={byArea} total={visibleVisits.length} />
        <ReportGroup title="التحليل حسب العميل / طريقة الشراء" icon="briefcase" rows={byAgent} total={visibleVisits.length} />
        <ReportGroup title="التحليل حسب الصنف والطلب" icon="package" rows={byProduct} total={orders} />

        <View style={styles.exportRow}>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.primary }]} onPress={() => share(() => shareVisitsPdf(visibleVisits, 'لوحة التقارير'))}>
            <Feather name="file-text" size={17} color="#fff" />
            <Text style={styles.exportText}>PDF</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.exportButton, { backgroundColor: colors.success }]} onPress={() => share(() => shareVisitsExcel({ ...data, visits: visibleVisits }))}>
            <Feather name="grid" size={17} color="#fff" />
            <Text style={styles.exportText}>Excel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '900' as const },
  iconButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  periodRow: { flexDirection: 'row-reverse', gap: 8 },
  periodButton: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
  statsRow: { flexDirection: 'row-reverse', gap: 8 },
  statCard: { flex: 1, alignItems: 'center', padding: 12, borderRadius: 14, borderWidth: 1, gap: 4 },
  statValue: { fontSize: 21, fontWeight: '900' as const },
  statLabel: { fontSize: 11, fontWeight: '700' as const },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 15, fontWeight: '900' as const, textAlign: 'right' },
  groupHeader: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  metricRow: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10 },
  metricMain: { flex: 1, gap: 5 },
  metricLabel: { fontSize: 13, fontWeight: '700' as const, textAlign: 'right' },
  metricValue: { width: 30, fontWeight: '900' as const, textAlign: 'center' },
  track: { height: 7, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  totalText: { textAlign: 'right', fontSize: 11 },
  moreText: { textAlign: 'right', fontSize: 11 },
  emptyText: { textAlign: 'right', fontSize: 13 },
  comparisonCard: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 8 },
  comparisonText: { textAlign: 'right', lineHeight: 22 },
  changeText: { textAlign: 'right', fontWeight: '900' as const },
  exportRow: { flexDirection: 'row-reverse', gap: 10 },
  exportButton: { flex: 1, borderRadius: 12, padding: 14, flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 8 },
  exportText: { color: '#fff', fontWeight: '900' as const },
});