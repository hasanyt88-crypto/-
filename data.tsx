import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';

const DATA_ITEMS = [
  { type: 'provinces', title: 'المحافظات', icon: 'map' as const, color: '#3b82f6', bg: '#eff6ff' },
  { type: 'areas', title: 'المناطق', icon: 'map-pin' as const, color: '#8b5cf6', bg: '#f5f3ff' },
  { type: 'agents', title: 'الوكلاء', icon: 'briefcase' as const, color: '#f59e0b', bg: '#fffbeb' },
  { type: 'categories', title: 'الفئات', icon: 'tag' as const, color: '#ec4899', bg: '#fdf2f8' },
  { type: 'companies', title: 'الشركات', icon: 'briefcase' as const, color: '#6366f1', bg: '#eef2ff' },
  { type: 'products', title: 'المنتجات', icon: 'package' as const, color: '#10b981', bg: '#f0fdf4' },
];

export default function DataScreen() {
  const { currentUser, data, visibleVisits } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  if (!currentUser) return <Redirect href="/login" />;

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const getCounts = (type: string): number => {
    switch (type) {
      case 'provinces': return data.provinces.length;
      case 'areas': return data.areas.length;
      case 'agents': return data.agents.length;
      case 'categories': return data.categories.length;
      case 'companies': return data.companies.length;
      case 'products': return data.products.length;
      default: return 0;
    }
  };

  const getCountLabel = (type: string): string => {
    switch (type) {
      case 'provinces': return 'عدد المحافظات';
      case 'areas': return 'عدد المناطق';
      case 'agents': return 'عدد الوكلاء';
      case 'categories': return 'عدد الفئات';
      case 'companies': return 'عدد الشركات';
      case 'products': return 'عدد المنتجات';
      default: return 'عدد العناصر';
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
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>إدارة البيانات</Text>
        <Text style={[styles.headerSub, { color: colors.mutedForeground }]}>المعلومات المستخدمة في الزيارات</Text>
      </View>

      <View style={{ padding: 20 }}>
        {/* Data Management Grid */}
        <View style={styles.grid}>
          {DATA_ITEMS.map(item => (
            <TouchableOpacity
              key={item.type}
              style={[styles.dataCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/data-manager', params: { type: item.type, title: item.title } })}
              activeOpacity={0.85}
            >
              <View style={[styles.dataIconBox, { backgroundColor: item.bg }]}>
                <Feather name={item.icon} size={22} color={item.color} />
              </View>
              <Text style={[styles.dataCardTitle, { color: colors.foreground }]}>{item.title}</Text>
              <Text style={[styles.dataCardCount, { color: colors.mutedForeground }]}>
                {getCountLabel(item.type)}: {getCounts(item.type)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ marginTop: 16, gap: 10 }}>
          <TouchableOpacity
            style={[styles.usersCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push('/reports' as any)}
          >
            <View style={styles.usersCardLeft}>
              <View style={[styles.usersIcon, { backgroundColor: '#eff6ff' }]}>
                <Feather name="bar-chart-2" size={22} color="#2563eb" />
              </View>
              <Text style={[styles.usersCardTitle, { color: colors.foreground }]}>لوحة التقارير والتحليلات</Text>
            </View>
            <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          {(currentUser.role === 'ADMIN' || currentUser.role === 'SUPERVISOR') && (
          <TouchableOpacity
            style={[styles.usersCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/data-manager', params: { type: 'users', role: 'REP', title: 'المندوبون' } })}
          >
            <View style={styles.usersCardLeft}>
              <View style={[styles.usersIcon, { backgroundColor: '#f0fdf4' }]}>
                <Feather name="user-check" size={22} color="#16a34a" />
              </View>
              <Text style={[styles.usersCardTitle, { color: colors.foreground }]}>إدارة المندوبين</Text>
            </View>
            <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          )}
          {currentUser.role === 'ADMIN' && (
          <TouchableOpacity
            style={[styles.usersCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => router.push({ pathname: '/data-manager', params: { type: 'products', mode: 'prices', title: 'إدارة الأسعار' } })}
          >
            <View style={styles.usersCardLeft}>
              <View style={[styles.usersIcon, { backgroundColor: '#fff7ed' }]}>
                <Feather name="dollar-sign" size={22} color="#ea580c" />
              </View>
              <Text style={[styles.usersCardTitle, { color: colors.foreground }]}>إدارة الأسعار</Text>
            </View>
            <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
          </TouchableOpacity>
          )}
        </View>

        {/* User Management - ADMIN only */}
        {currentUser.role === 'ADMIN' && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>إدارة المستخدمين</Text>
            <TouchableOpacity
              style={[styles.usersCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => router.push({ pathname: '/data-manager', params: { type: 'users', title: 'المستخدمون' } })}
              activeOpacity={0.85}
            >
              <View style={styles.usersCardLeft}>
                <View style={[styles.usersIcon, { backgroundColor: '#fef3c7' }]}>
                  <Feather name="users" size={22} color="#d97706" />
                </View>
                <View>
                  <Text style={[styles.usersCardTitle, { color: colors.foreground }]}>المشرفون والمندوبون</Text>
                  <View style={styles.usersCount}>
                    <Text style={[styles.usersCardSub, { color: colors.mutedForeground }]}>
                      عدد المستخدمين: {data.users.length}
                    </Text>
                  </View>
                </View>
              </View>
              <Feather name="chevron-left" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>
        )}

        {/* Stats Summary */}
        <View style={{ marginTop: 24 }}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملخص الأرقام</Text>
          <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {[
              { label: 'الزيارات', value: visibleVisits.length, icon: 'map-pin' as const },
              { label: 'المحافظات', value: data.provinces.length, icon: 'map' as const },
              { label: 'المناطق', value: data.areas.length, icon: 'map-pin' as const },
              { label: 'المنتجات', value: data.products.length, icon: 'package' as const },
            ].map((row, i) => (
              <View key={i} style={[styles.summaryRow, i < 3 ? { borderBottomWidth: 1, borderBottomColor: colors.border } : {}]}>
                <Text style={[styles.summaryValue, { color: colors.primary }]}>{row.value}</Text>
                <View style={styles.summaryLeft}>
                  <Feather name={row.icon} size={14} color={colors.mutedForeground} />
                  <Text style={[styles.summaryLabel, { color: colors.foreground }]}>{row.label}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingBottom: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 24, fontWeight: '900' as const, textAlign: 'right' },
  headerSub: { fontSize: 13, textAlign: 'right', marginTop: 2 },
  sectionTitle: { fontSize: 15, fontWeight: '800' as const, textAlign: 'right', marginBottom: 12 },
  grid: { flexDirection: 'row-reverse', flexWrap: 'wrap', gap: 12 },
  dataCard: {
    width: '47%', padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'flex-end',
    gap: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  dataIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dataCardTitle: { fontSize: 14, fontWeight: '800' as const, textAlign: 'right' },
  dataCardCount: { fontSize: 12, textAlign: 'right', writingDirection: 'rtl' as const },
  usersCard: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderRadius: 16, borderWidth: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  usersCardLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 12 },
  usersIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  usersCardTitle: { fontSize: 15, fontWeight: '800' as const, textAlign: 'right' },
  usersCardSub: { fontSize: 12, marginTop: 2, textAlign: 'right' },
  usersCount: { alignItems: 'flex-end' },
  summaryCard: { borderRadius: 16, borderWidth: 1, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  summaryRow: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  summaryLeft: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  summaryLabel: { fontSize: 14, fontWeight: '600' as const, textAlign: 'right', writingDirection: 'rtl' as const },
  summaryValue: { fontSize: 20, fontWeight: '900' as const, writingDirection: 'rtl' as const },
});
