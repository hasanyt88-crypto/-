import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, FlatList, Platform, Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp, DataType, AppUser } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import { PRODUCT_CATALOG } from '@/lib/productCatalog';

type PickerOption = { label: string; value: string };
type EditingProduct = {
  id: string;
  name: string;
  price: string;
  category: string;
  currency: string;
  company: string;
};

import { Modal } from 'react-native';

function PickerModal({ visible, title, options, onSelect, onClose }: {
  visible: boolean; title: string; options: PickerOption[];
  onSelect: (o: PickerOption) => void; onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.handle, { backgroundColor: colors.border }]} />
          <Text style={[styles.modalTitle, { color: colors.foreground }]}>{title}</Text>
          <FlatList
            data={options}
            keyExtractor={i => i.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalOption, { borderBottomColor: colors.border }]}
                onPress={() => { onSelect(item); onClose(); }}
              >
                <Text style={[styles.modalOptionText, { color: colors.foreground }]}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.muted }]} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const ROLE_OPTIONS: PickerOption[] = [
  { label: 'مشرف', value: 'SUPERVISOR' },
  { label: 'مندوب', value: 'REP' },
];
const ROLE_LABELS: Record<string, string> = { ADMIN: 'مدير النظام', SUPERVISOR: 'مشرف', REP: 'مندوب' };
const APK_DOWNLOAD_URL = 'https://expo.dev/accounts/hetary/projects/hasco-pro';

export default function DataManagerScreen() {
  const { type, title, role: roleFilter, mode } = useLocalSearchParams<{
    type: string;
    title: string;
    role?: string;
    mode?: string;
  }>();
  const { currentUser, data, addDataItem, deleteDataItem, addUser, deleteUser, updateProduct } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [priceInput, setPriceInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<PickerOption | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PickerOption | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<PickerOption | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<PickerOption>({ label: 'جديدة', value: 'جديدة' });
  const [selectedRole, setSelectedRole] = useState<PickerOption | null>(null);
  const [selectedSupervisor, setSelectedSupervisor] = useState<PickerOption | null>(null);
  const [showProvPicker, setShowProvPicker] = useState(false);
  const [showCatPicker, setShowCatPicker] = useState(false);
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [showEditCategoryPicker, setShowEditCategoryPicker] = useState(false);
  const [showEditCompanyPicker, setShowEditCompanyPicker] = useState(false);
  const [showEditCurrencyPicker, setShowEditCurrencyPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [showSupervisorPicker, setShowSupervisorPicker] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EditingProduct | null>(null);

  const provinceOptions: PickerOption[] = data.provinces.map(p => ({ label: p.name, value: p.id }));
  const categoryOptions: PickerOption[] = Array.from(new Set([
    ...data.categories.map(c => c.name),
    ...PRODUCT_CATALOG.map(product => product.category),
  ])).map(name => ({ label: name, value: name }));
  const companyOptions: PickerOption[] = data.companies.map(company => ({ label: company.name, value: company.name }));
  const currencyOptions: PickerOption[] = [
    { label: 'جديدة', value: 'جديدة' },
    { label: 'قديمة', value: 'قديمة' },
  ];
  const supervisorOptions: PickerOption[] = data.users
    .filter(user => user.role === 'SUPERVISOR' && (currentUser?.role !== 'SUPERVISOR' || user.id === currentUser.id))
    .map(user => ({ label: user.name, value: user.id }));
  const roleOptions = currentUser?.role === 'SUPERVISOR'
    ? ROLE_OPTIONS.filter(option => option.value === 'REP')
    : ROLE_OPTIONS;

  const handleAdd = () => {
    if (!nameInput.trim()) { Alert.alert('تنبيه', 'يرجى إدخال الاسم'); return; }

    if (type === 'provinces' || type === 'categories' || type === 'companies') {
      addDataItem(type as DataType, { name: nameInput.trim() });
    } else if (type === 'areas') {
      if (!selectedProvince) { Alert.alert('تنبيه', 'يرجى اختيار المحافظة'); return; }
      addDataItem('areas', { name: nameInput.trim(), provinceId: selectedProvince.value });
    } else if (type === 'agents') {
      addDataItem('agents', { name: nameInput.trim(), phone: phoneInput.trim() });
    } else if (type === 'products') {
      const price = Number(priceInput);
      if (!Number.isFinite(price) || price < 0) {
        Alert.alert('تنبيه', 'يرجى إدخال سعر جملة صحيح');
        return;
      }
      addDataItem('products', {
        name: nameInput.trim(),
        price,
        category: selectedCategory?.value ?? '',
        currency: selectedCurrency.value,
        company: selectedCompany?.value ?? '',
      });
    } else if (type === 'users') {
      if (!passwordInput.trim()) { Alert.alert('تنبيه', 'يرجى إدخال كلمة المرور'); return; }
      if (!selectedRole) { Alert.alert('تنبيه', 'يرجى اختيار الدور'); return; }
      if (selectedRole.value === 'REP' && !selectedSupervisor) {
        Alert.alert('تنبيه', 'يرجى اختيار المشرف للمندوب');
        return;
      }
      addUser({
        name: nameInput.trim(),
        password: passwordInput.trim(),
        role: selectedRole.value as any,
        phone: phoneInput.trim(),
        parentId: selectedRole.value === 'REP' ? selectedSupervisor?.value : undefined,
      });
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameInput('');
    setPhoneInput('');
    setPriceInput('');
    setPasswordInput('');
    setSelectedProvince(null);
    setSelectedCategory(null);
    setSelectedCompany(null);
    setSelectedCurrency({ label: 'جديدة', value: 'جديدة' });
    setSelectedRole(null);
    setSelectedSupervisor(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('تأكيد الحذف', 'هل تريد حذف هذا العنصر؟', [
      { text: 'إلغاء', style: 'cancel' },
      {
        text: 'حذف', style: 'destructive', onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          if (type === 'users') deleteUser(id);
          else deleteDataItem(type as DataType, id);
        },
      },
    ]);
  };

  const shareUserDownloadLink = async (user: AppUser) => {
    try {
      await Share.share({
        title: 'رابط تنزيل HETAR Pro',
        message: [
          'تطبيق HETAR Pro',
          '',
          `اسم المستخدم: ${user.name}`,
          `كلمة المرور: ${user.password}`,
          '',
          'رابط تنزيل التطبيق (افتح الرابط ثم اختر أحدث نسخة APK):',
          APK_DOWNLOAD_URL,
          '',
          'بعد التنزيل ثبّت التطبيق وسجّل الدخول بالبيانات أعلاه.',
        ].join('\n'),
      });
    } catch {
      Alert.alert('تعذر المشاركة', 'لم نتمكن من فتح نافذة المشاركة على هذا الجهاز.');
    }
  };

  const getItems = () => {
    switch (type) {
      case 'provinces': return data.provinces;
      case 'areas': return data.areas;
      case 'agents': return data.agents;
      case 'categories': return data.categories;
      case 'companies': return data.companies;
      case 'products': return data.products;
      case 'users': {
        const users = roleFilter ? data.users.filter(user => user.role === roleFilter) : data.users;
        return currentUser?.role === 'SUPERVISOR'
          ? users.filter(user => user.id === currentUser.id || user.parentId === currentUser.id)
          : users;
      }
      default: return [];
    }
  };

  const getItemSubtitle = (item: Record<string, any>) => {
    if (type === 'areas') {
      const prov = data.provinces.find(p => p.id === item.provinceId);
      return prov?.name ?? '';
    }
    if (type === 'agents') return item.phone ?? '';
    if (type === 'products') {
      const priceDetails = [
        `السعر المعتمد: ${item.price} ريال يمني`,
        item.oldPrice !== undefined ? `قديم: ${item.oldPrice}` : '',
        item.newPrice !== undefined ? `جديد: ${item.newPrice}` : '',
        item.currency ? `عملة ${item.currency}` : '',
        item.category ? item.category : '',
      ].filter(Boolean).join(' • ');
      return `${item.company ? `الشركة: ${item.company} • ` : ''}${priceDetails}`;
    }
    if (type === 'users') return ROLE_LABELS[item.role] ?? item.role;
    return '';
  };

  const getNamePlaceholder = () => {
    switch (type) {
      case 'provinces': return 'اسم المحافظة';
      case 'areas': return 'اسم المنطقة';
      case 'agents': return 'اسم العميل أو الموزع';
      case 'categories': return 'اسم الفئة';
      case 'companies': return 'اسم الشركة';
      case 'products': return mode === 'prices' ? 'اسم المنتج أو الصنف' : 'اسم المنتج';
      case 'users': return 'اسم المستخدم';
      default: return 'الاسم';
    }
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  if (!currentUser) return <Redirect href="/login" />;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-right" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>{title ?? 'إدارة البيانات'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Add Form */}
        <View style={[styles.formCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.formTitle, { color: colors.foreground }]}>إضافة عنصر جديد</Text>

          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
            placeholder={getNamePlaceholder()}
            placeholderTextColor={colors.mutedForeground}
            value={nameInput}
            onChangeText={setNameInput}
            textAlign="right"
          />

          {(type === 'agents' || type === 'users') && (
            <TextInput
              style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
              placeholder="رقم الجوال"
              placeholderTextColor={colors.mutedForeground}
              value={phoneInput}
              onChangeText={setPhoneInput}
              keyboardType="phone-pad"
              textAlign="right"
            />
          )}

          {type === 'users' && (
            <>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                placeholder="كلمة المرور"
                placeholderTextColor={colors.mutedForeground}
                value={passwordInput}
                onChangeText={setPasswordInput}
                secureTextEntry
                textAlign="right"
              />
              <TouchableOpacity
                style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowRolePicker(true)}
              >
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                <Text style={[styles.selectText, { color: selectedRole ? colors.foreground : colors.mutedForeground }]}>
                  {selectedRole?.label ?? 'اختر الدور'}
                </Text>
              </TouchableOpacity>
              {selectedRole?.value === 'REP' && (
                <TouchableOpacity
                  style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
                  onPress={() => setShowSupervisorPicker(true)}
                >
                  <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                  <Text style={[styles.selectText, { color: selectedSupervisor ? colors.foreground : colors.mutedForeground }]}>
                    {selectedSupervisor?.label ?? 'اختر المشرف'}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {type === 'areas' && (
            <TouchableOpacity
              style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={() => setShowProvPicker(true)}
            >
              <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
              <Text style={[styles.selectText, { color: selectedProvince ? colors.foreground : colors.mutedForeground }]}>
                {selectedProvince?.label ?? 'اختر المحافظة'}
              </Text>
            </TouchableOpacity>
          )}

          {type === 'products' && (
            <>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                placeholder="سعر الجملة بالريال اليمني"
                placeholderTextColor={colors.mutedForeground}
                value={priceInput}
                onChangeText={setPriceInput}
                keyboardType="numeric"
                textAlign="right"
              />
              <TouchableOpacity
                style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowCatPicker(true)}
              >
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                <Text style={[styles.selectText, { color: selectedCategory ? colors.foreground : colors.mutedForeground }]}>
                  {selectedCategory?.label ?? 'اختر الفئة (اختياري)'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowCurrencyPicker(true)}
              >
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                <Text style={[styles.selectText, { color: colors.foreground }]}>
                  {selectedCurrency.label}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
                onPress={() => setShowCompanyPicker(true)}
              >
                <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
                <Text style={[styles.selectText, { color: selectedCompany ? colors.foreground : colors.mutedForeground }]}>
                  {selectedCompany?.label ?? 'اختر الشركة (اختياري)'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: colors.primary }]}
            onPress={handleAdd}
          >
            <Feather name="plus" size={18} color="#fff" />
            <Text style={styles.addBtnText}>إضافة</Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        <View>
          <Text style={[styles.listTitle, { color: colors.foreground }]}>
            العناصر المسجّلة: {getItems().length}
          </Text>
          {getItems().length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Feather name="inbox" size={28} color={colors.mutedForeground} />
              <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>لا توجد عناصر بعد</Text>
            </View>
          ) : (
            (getItems() as Array<Record<string, any>>).map((item) => (
              <View key={item.id} style={[styles.listItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.itemActions}>
                  {type === 'products' && mode === 'prices' && (
                    <TouchableOpacity
                      onPress={() => {
                        if (editingProduct?.id === item.id) {
                          const productToSave = editingProduct;
                          if (!productToSave) return;
                          const nextPrice = Number(productToSave.price);
                          if (!productToSave.name.trim()) {
                            Alert.alert('تنبيه', 'أدخل اسم الصنف');
                          } else if (!Number.isFinite(nextPrice) || nextPrice < 0) {
                            Alert.alert('تنبيه', 'أدخل سعر جملة صحيح');
                          } else {
                            updateProduct(item.id, {
                              name: productToSave.name.trim(),
                              price: nextPrice,
                              category: productToSave.category,
                              currency: productToSave.currency,
                              company: productToSave.company,
                            });
                            setEditingProduct(null);
                          }
                        } else {
                          setEditingProduct({
                            id: item.id,
                            name: String(item.name ?? ''),
                            price: String(item.price ?? 0),
                            category: String(item.category ?? ''),
                            currency: String(item.currency ?? 'جديدة'),
                            company: String(item.company ?? ''),
                          });
                        }
                      }}
                      style={styles.editBtn}
                    >
                      <Feather name={editingProduct?.id === item.id ? 'check' : 'edit-2'} size={16} color={colors.info} />
                    </TouchableOpacity>
                  )}
                  {type === 'products' && mode === 'prices' && editingProduct?.id === item.id && (
                    <TouchableOpacity onPress={() => setEditingProduct(null)} style={styles.editCancelBtn}>
                      <Feather name="x" size={16} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                    <Feather name="trash-2" size={16} color={colors.destructive} />
                  </TouchableOpacity>
                </View>
                <View style={styles.itemInfo}>
                  {type === 'products' && mode === 'prices' && editingProduct?.id === item.id ? (
                    <>
                      <TextInput
                        style={[styles.priceEditInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                        value={editingProduct!.name}
                        onChangeText={name => setEditingProduct(prev => prev ? { ...prev, name } : prev)}
                        textAlign="right"
                        placeholder="اسم الصنف"
                        placeholderTextColor={colors.mutedForeground}
                      />
                      <TextInput
                        style={[styles.priceEditInput, { borderColor: colors.border, color: colors.foreground, backgroundColor: colors.background }]}
                        value={editingProduct!.price}
                        onChangeText={price => setEditingProduct(prev => prev ? { ...prev, price } : prev)}
                        keyboardType="numeric"
                        textAlign="right"
                        placeholder="سعر الجملة"
                        placeholderTextColor={colors.mutedForeground}
                      />
                      <TouchableOpacity
                        style={[styles.editSelect, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => setShowEditCategoryPicker(true)}
                      >
                        <Text style={[styles.editSelectText, { color: editingProduct!.category ? colors.foreground : colors.mutedForeground }]}>
                          {editingProduct!.category || 'اختر الفئة'}
                        </Text>
                        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSelect, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => setShowEditCurrencyPicker(true)}
                      >
                        <Text style={[styles.editSelectText, { color: colors.foreground }]}>
                          نوع العملة: {editingProduct!.currency || 'جديدة'}
                        </Text>
                        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.editSelect, { borderColor: colors.border, backgroundColor: colors.background }]}
                        onPress={() => setShowEditCompanyPicker(true)}
                      >
                        <Text style={[styles.editSelectText, { color: editingProduct!.company ? colors.foreground : colors.mutedForeground }]}>
                          الشركة: {editingProduct!.company || 'اختر الشركة'}
                        </Text>
                        <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <Text style={[styles.itemName, { color: colors.foreground }]}>{item.name}</Text>
                  )}
                  {!!getItemSubtitle(item) && (
                    <Text style={[styles.itemSub, { color: colors.mutedForeground }]}>{getItemSubtitle(item)}</Text>
                  )}
                   {type === 'users' && item.role !== 'ADMIN' && (
                     <TouchableOpacity
                       style={[styles.shareBtn, { backgroundColor: colors.successBg }]}
                       onPress={() => shareUserDownloadLink(item as AppUser)}
                     >
                       <Feather name="send" size={14} color={colors.success} />
                       <Text style={[styles.shareBtnText, { color: colors.success }]}>إنشاء رابط إرسال</Text>
                     </TouchableOpacity>
                   )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <PickerModal visible={showProvPicker} title="المحافظة" options={provinceOptions}
        onSelect={setSelectedProvince} onClose={() => setShowProvPicker(false)} />
      <PickerModal visible={showCatPicker} title="الفئة" options={categoryOptions}
        onSelect={setSelectedCategory} onClose={() => setShowCatPicker(false)} />
      <PickerModal visible={showCurrencyPicker} title="نوع العملة" options={currencyOptions}
        onSelect={setSelectedCurrency} onClose={() => setShowCurrencyPicker(false)} />
      <PickerModal visible={showCompanyPicker} title="الشركة" options={companyOptions}
        onSelect={setSelectedCompany} onClose={() => setShowCompanyPicker(false)} />
      <PickerModal visible={showEditCategoryPicker} title="تعديل الفئة" options={categoryOptions}
        onSelect={option => setEditingProduct(prev => prev ? { ...prev, category: option.value } : prev)}
        onClose={() => setShowEditCategoryPicker(false)} />
      <PickerModal visible={showEditCompanyPicker} title="تعديل الشركة" options={companyOptions}
        onSelect={option => setEditingProduct(prev => prev ? { ...prev, company: option.value } : prev)}
        onClose={() => setShowEditCompanyPicker(false)} />
      <PickerModal visible={showEditCurrencyPicker} title="تعديل نوع العملة" options={currencyOptions}
        onSelect={option => setEditingProduct(prev => prev ? { ...prev, currency: option.value } : prev)}
        onClose={() => setShowEditCurrencyPicker(false)} />
      <PickerModal visible={showRolePicker} title="الدور الوظيفي" options={roleOptions}
        onSelect={setSelectedRole} onClose={() => setShowRolePicker(false)} />
      <PickerModal visible={showSupervisorPicker} title="المشرف المسؤول" options={supervisorOptions}
        onSelect={setSelectedSupervisor} onClose={() => setShowSupervisorPicker(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1 },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' as const },
  formCard: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  formTitle: { fontSize: 15, fontWeight: '800' as const, textAlign: 'right', marginBottom: 4 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 14 },
  select: { borderWidth: 1.5, borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  selectText: { flex: 1, fontSize: 14, textAlign: 'right' },
  addBtn: { borderRadius: 12, paddingVertical: 14, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addBtnText: { color: '#fff', fontWeight: '800' as const, fontSize: 14 },
  listTitle: { fontSize: 14, fontWeight: '700' as const, textAlign: 'right', marginBottom: 12 },
  listItem: { flexDirection: 'row-reverse', alignItems: 'center', padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 8, gap: 12 },
  itemActions: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6 },
  editBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  editCancelBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center' },
  deleteBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '700' as const, textAlign: 'right' },
  itemSub: { fontSize: 12, textAlign: 'right', marginTop: 2 },
  shareBtn: { alignSelf: 'flex-end', flexDirection: 'row-reverse', alignItems: 'center', gap: 6, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7, marginTop: 8 },
  shareBtnText: { fontSize: 12, fontWeight: '700' as const },
  priceEditInput: { borderWidth: 1, borderRadius: 8, padding: 7, marginTop: 6, fontSize: 13 },
  editSelect: { borderWidth: 1, borderRadius: 8, padding: 8, marginTop: 6, flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between' },
  editSelectText: { flex: 1, fontSize: 12, textAlign: 'right' },
  emptyState: { borderRadius: 14, borderWidth: 1, padding: 32, alignItems: 'center', gap: 8, borderStyle: 'dashed' },
  emptyText: { fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24, maxHeight: '65%' },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' as const, textAlign: 'center', marginBottom: 8, paddingHorizontal: 20 },
  modalOption: { padding: 16, borderBottomWidth: 1 },
  modalOptionText: { fontSize: 15, textAlign: 'right' },
  cancelBtn: { margin: 16, borderRadius: 14, padding: 14, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' as const },
});
