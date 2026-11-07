import React, { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, FlatList, Image, ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useApp, VisitProduct } from '@/context/AppContext';
import { useColors } from '@/hooks/useColors';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

interface Option { label: string; value: string; }

function PickerModal({ visible, title, options, onSelect, onClose }: {
  visible: boolean; title: string; options: Option[];
  onSelect: (o: Option) => void; onClose: () => void;
}) {
  const colors = useColors();
  return (
    <Modal visible={visible} transparent animationType="slide">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalSheet, { backgroundColor: colors.card }]}>
          <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />
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
          <TouchableOpacity style={[styles.modalCancel, { backgroundColor: colors.muted }]} onPress={onClose}>
            <Text style={[styles.modalCancelText, { color: colors.mutedForeground }]}>إلغاء</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function FieldLabel({ label, required }: { label: string; required?: boolean }) {
  const colors = useColors();
  return (
    <Text style={[styles.fieldLabel, { color: colors.foreground }]}>
      {label}{required && <Text style={{ color: colors.primary }}> *</Text>}
    </Text>
  );
}

export default function NewVisitScreen() {
  const { currentUser, data, addVisit } = useApp();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [outletName, setOutletName] = useState('');
  const [outletPhone, setOutletPhone] = useState('');
  const [outletType, setOutletType] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<Option | null>(null);
  const [selectedArea, setSelectedArea] = useState<Option | null>(null);
  const [purchaseMethod, setPurchaseMethod] = useState('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [products, setProducts] = useState<VisitProduct[]>([]);
  const [photo, setPhoto] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
  const [loadingGps, setLoadingGps] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showOutletTypePicker, setShowOutletTypePicker] = useState(false);
  const [showProvincePicker, setShowProvincePicker] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);
  const [showPurchaseMethodPicker, setShowPurchaseMethodPicker] = useState(false);
  const [showProductPicker, setShowProductPicker] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');

  const provinceOptions: Option[] = data.provinces.map(p => ({ label: p.name, value: p.id }));
  const filteredAreas: Option[] = useMemo(
    () => data.areas.filter(a => a.provinceId === selectedProvince?.value).map(a => ({ label: a.name, value: a.id })),
    [data.areas, selectedProvince]
  );
  const purchaseMethodOptions: Option[] = [
    { label: 'مندوب', value: 'مندوب' },
    { label: 'سوق', value: 'سوق' },
    { label: 'عميل', value: 'عميل' },
  ];
  const productOptions: Option[] = data.products.map(p => ({
    label: `${p.name}${p.company ? ` • ${p.company}` : ''} - ${p.price} ريال يمني${p.currency ? ` (${p.currency})` : ''}${p.category ? ` • ${p.category}` : ''}`,
    value: p.id,
  }));
  const outletTypeOptions: Option[] = [
    { label: 'تجزئة', value: 'تجزئة' },
    { label: 'جملة', value: 'جملة' },
    { label: 'أخرى', value: 'أخرى' },
  ];

  const captureGPS = async () => {
    setLoadingGps(true);
    try {
      if (Platform.OS !== 'web') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('الإذن مطلوب', 'يرجى السماح للتطبيق بالوصول إلى الموقع');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        navigator.geolocation?.getCurrentPosition(
          pos => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => Alert.alert('خطأ', 'تعذّر الحصول على الموقع')
        );
      }
    } catch {
      Alert.alert('خطأ', 'تعذّر الحصول على الموقع');
    } finally {
      setLoadingGps(false);
    }
  };

  const capturePhoto = async () => {
    const compressPhoto = async (uri: string) => {
      const result = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1280 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG },
      );
      return result.uri;
    };
    try {
      if (Platform.OS !== 'web') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          // Try gallery
          const gStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (gStatus.status !== 'granted') {
            Alert.alert('الإذن مطلوب', 'يرجى السماح بالوصول للكاميرا أو المعرض');
            return;
          }
        }
      }
      Alert.alert('إضافة صورة', 'اختر المصدر', [
        {
          text: 'الكاميرا', onPress: async () => {
            const r = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.6 });
            if (!r.canceled && r.assets[0]) setPhoto(await compressPhoto(r.assets[0].uri));
          },
        },
        {
          text: 'المعرض', onPress: async () => {
            const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.6 });
            if (!r.canceled && r.assets[0]) setPhoto(await compressPhoto(r.assets[0].uri));
          },
        },
        { text: 'إلغاء', style: 'cancel' },
      ]);
    } catch {
      Alert.alert('خطأ', 'تعذّر التقاط الصورة');
    }
  };

  const addProductRow = () => {
    setProducts(prev => [...prev, { name: '', stock: 0, order: 0 }]);
  };

  const updateProduct = (idx: number, field: keyof VisitProduct, value: string | number) => {
    setProducts(prev => prev.map((p, i) => i === idx ? { ...p, [field]: value } : p));
  };

  const removeProduct = (idx: number) => {
    setProducts(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = () => {
    if (!outletName.trim()) { Alert.alert('تنبيه', 'يرجى إدخال اسم العميل'); return; }
    if (!outletType) { Alert.alert('تنبيه', 'يرجى اختيار نوع العميل'); return; }
    if (!selectedProvince) { Alert.alert('تنبيه', 'يرجى اختيار المحافظة'); return; }
    if (!selectedArea) { Alert.alert('تنبيه', 'يرجى اختيار المنطقة'); return; }
    if (products.some(p => !p.name)) { Alert.alert('تنبيه', 'يرجى اختيار الصنف لكل منتج مضاف'); return; }

    setSaving(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    addVisit({
      outletName: outletName.trim(),
      outletPhone: outletPhone.trim() || undefined,
      outletType,
      userId: currentUser?.id ?? '',
      userName: currentUser?.name ?? '',
      province: selectedProvince.label,
      area: selectedArea.label,
      // Keep the legacy storage key so existing visits and backups remain compatible.
      agent: purchaseMethod || undefined,
      customerName: purchaseMethod === 'عميل' ? customerName.trim() || undefined : undefined,
      customerNumber: purchaseMethod === 'عميل' ? customerNumber.trim() || undefined : undefined,
      products: products.filter(p => p.name),
      photo: photo ?? undefined,
      gps: gps ?? undefined,
      notes: notes.trim() || undefined,
    });

    setSaving(false);
    router.back();
  };

  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 8, backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="x" size={22} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>زيارة جديدة</Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveBtnText}>حفظ</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20, gap: 16 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Outlet Info */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>بيانات العميل</Text>

          <FieldLabel label="اسم العميل / المنشأة" required />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
            placeholder="أدخل اسم العميل"
            placeholderTextColor={colors.mutedForeground}
            value={outletName}
            onChangeText={setOutletName}
            textAlign="right"
          />

          <FieldLabel label="رقم الجوال" />
          <TextInput
            style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
            placeholder="أدخل رقم الجوال"
            placeholderTextColor={colors.mutedForeground}
            value={outletPhone}
            onChangeText={setOutletPhone}
            keyboardType="phone-pad"
            textAlign="right"
          />

          <FieldLabel label="نوع المنفذ" required />
          <TouchableOpacity
            style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowOutletTypePicker(true)}
          >
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            <Text style={[styles.selectText, { color: outletType ? colors.foreground : colors.mutedForeground }]}>
              {outletType || 'اختر النوع'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Location */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>الموقع الجغرافي</Text>

          <FieldLabel label="المحافظة" required />
          <TouchableOpacity
            style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowProvincePicker(true)}
          >
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            <Text style={[styles.selectText, { color: selectedProvince ? colors.foreground : colors.mutedForeground }]}>
              {selectedProvince?.label || 'اختر المحافظة'}
            </Text>
          </TouchableOpacity>

          <FieldLabel label="المنطقة" required />
          <TouchableOpacity
            style={[styles.select, { borderColor: selectedProvince ? colors.border : colors.muted, backgroundColor: selectedProvince ? colors.background : colors.muted, opacity: selectedProvince ? 1 : 0.6 }]}
            onPress={() => selectedProvince && setShowAreaPicker(true)}
          >
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            <Text style={[styles.selectText, { color: selectedArea ? colors.foreground : colors.mutedForeground }]}>
              {selectedArea?.label || (selectedProvince ? 'اختر المنطقة' : 'اختر المحافظة أولاً')}
            </Text>
          </TouchableOpacity>

          <FieldLabel label="طريقة الشراء" />
          <TouchableOpacity
            style={[styles.select, { borderColor: colors.border, backgroundColor: colors.background }]}
            onPress={() => setShowPurchaseMethodPicker(true)}
          >
            <Feather name="chevron-down" size={16} color={colors.mutedForeground} />
            <Text style={[styles.selectText, { color: purchaseMethod ? colors.foreground : colors.mutedForeground }]}>
              {purchaseMethod || 'اختر طريقة الشراء'}
            </Text>
          </TouchableOpacity>

          {purchaseMethod === 'عميل' && (
            <>
              <FieldLabel label="اسم العميل" />
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                placeholder="أدخل اسم العميل"
                placeholderTextColor={colors.mutedForeground}
                value={customerName}
                onChangeText={setCustomerName}
                textAlign="right"
              />

              <FieldLabel label="رقم هاتف العميل" />
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
                placeholder="أدخل رقم هاتف العميل"
                placeholderTextColor={colors.mutedForeground}
                value={customerNumber}
                onChangeText={setCustomerNumber}
                keyboardType="phone-pad"
                textAlign="right"
              />
            </>
          )}

          {/* GPS */}
          <TouchableOpacity
            style={[styles.gpsBtn, { backgroundColor: gps ? colors.successBg : colors.muted, borderColor: gps ? colors.success : colors.border }]}
            onPress={captureGPS}
            disabled={loadingGps}
          >
            {loadingGps ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Feather name="navigation" size={18} color={gps ? colors.success : colors.primary} />
            )}
            <Text style={[styles.gpsBtnText, { color: gps ? colors.success : colors.foreground }]}>
              {gps ? `تم تسجيل الموقع: ${gps.lat.toFixed(4)}, ${gps.lng.toFixed(4)}` : 'تسجيل الموقع الحالي'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Photo */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>صورة العميل</Text>
          {photo ? (
            <View>
              <Image source={{ uri: photo }} style={styles.photoPreview} resizeMode="cover" />
              <TouchableOpacity style={[styles.removePhoto, { backgroundColor: colors.destructive }]} onPress={() => setPhoto(null)}>
                <Feather name="x" size={14} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.background }]}
              onPress={capturePhoto}
            >
              <Feather name="camera" size={28} color={colors.primary} />
              <Text style={[styles.photoBtnText, { color: colors.mutedForeground }]}>التقاط صورة</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Products */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.sectionHeader}>
            <TouchableOpacity
              style={[styles.addProductBtn, { backgroundColor: colors.accent }]}
              onPress={addProductRow}
            >
              <Feather name="plus" size={16} color={colors.primary} />
              <Text style={[styles.addProductText, { color: colors.primary }]}>إضافة منتج</Text>
            </TouchableOpacity>
            <Text style={[styles.sectionTitle, { color: colors.foreground, marginBottom: 0 }]}>المنتجات والطلبات</Text>
          </View>

          {products.length === 0 && (
            <Text style={[styles.emptyProducts, { color: colors.mutedForeground }]}>لم تتم إضافة منتجات بعد</Text>
          )}

          {products.map((prod, idx) => (
            <View key={idx} style={[styles.productRow, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <View style={styles.productRowHeader}>
                <TouchableOpacity onPress={() => removeProduct(idx)}>
                  <Feather name="x-circle" size={18} color={colors.destructive} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.select, { flex: 1, borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => setShowProductPicker(idx)}
                >
                  <Feather name="chevron-down" size={14} color={colors.mutedForeground} />
                  <Text style={[styles.selectText, { color: prod.name ? colors.foreground : colors.mutedForeground, fontSize: 13 }]} numberOfLines={1}>
                    {prod.name || 'اختر المنتج'}
                  </Text>
                </TouchableOpacity>
              </View>
              <View style={styles.qtyRow}>
                <View style={styles.qtyField}>
                  <Text style={[styles.qtyLabel, { color: colors.mutedForeground }]}>الكمية المطلوبة</Text>
                  <TextInput
                    style={[styles.qtyInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                    keyboardType="numeric"
                    value={prod.order > 0 ? String(prod.order) : ''}
                    onChangeText={v => updateProduct(idx, 'order', parseInt(v) || 0)}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="center"
                  />
                </View>
                <View style={styles.qtyField}>
                  <Text style={[styles.qtyLabel, { color: colors.mutedForeground }]}>الكمية المتوفرة</Text>
                  <TextInput
                    style={[styles.qtyInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.foreground }]}
                    keyboardType="numeric"
                    value={prod.stock > 0 ? String(prod.stock) : ''}
                    onChangeText={v => updateProduct(idx, 'stock', parseInt(v) || 0)}
                    placeholder="0"
                    placeholderTextColor={colors.mutedForeground}
                    textAlign="center"
                  />
                </View>
              </View>
            </View>
          ))}

        </View>

        {/* Notes */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>ملاحظات</Text>
          <TextInput
            style={[styles.notesInput, { borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground }]}
            placeholder="ملاحظات وتوصيات..."
            placeholderTextColor={colors.mutedForeground}
            value={notes}
            onChangeText={setNotes}
            multiline
            textAlignVertical="top"
            textAlign="right"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveFullBtn, { backgroundColor: colors.primary, opacity: saving ? 0.7 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveFullBtnText}>حفظ الزيارة</Text>}
        </TouchableOpacity>
      </ScrollView>

      {/* Pickers */}
      <PickerModal visible={showOutletTypePicker} title="اختر نوع المنفذ" options={outletTypeOptions}
        onSelect={o => setOutletType(o.value)} onClose={() => setShowOutletTypePicker(false)} />
      <PickerModal visible={showProvincePicker} title="اختر المحافظة" options={provinceOptions}
        onSelect={o => { setSelectedProvince(o); setSelectedArea(null); }} onClose={() => setShowProvincePicker(false)} />
      <PickerModal visible={showAreaPicker} title="اختر المنطقة" options={filteredAreas}
        onSelect={setSelectedArea} onClose={() => setShowAreaPicker(false)} />
      <PickerModal visible={showPurchaseMethodPicker} title="اختر طريقة الشراء" options={purchaseMethodOptions}
        onSelect={o => setPurchaseMethod(o.value)} onClose={() => setShowPurchaseMethodPicker(false)} />
      {showProductPicker !== null && (
        <PickerModal visible title="اختر المنتج" options={productOptions}
          onSelect={o => updateProduct(showProductPicker!, 'name', data.products.find(product => product.id === o.value)?.name ?? '')}
          onClose={() => setShowProductPicker(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800' as const },
  saveBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontWeight: '800' as const, fontSize: 14 },
  section: { borderRadius: 16, padding: 16, borderWidth: 1, gap: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800' as const, textAlign: 'right', marginBottom: 4 },
  sectionHeader: { flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  fieldLabel: { fontSize: 13, fontWeight: '700' as const, textAlign: 'right', marginBottom: 4 },
  input: { borderWidth: 1.5, borderRadius: 12, padding: 12, fontSize: 15 },
  select: { borderWidth: 1.5, borderRadius: 12, padding: 12, flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  selectText: { flex: 1, fontSize: 14, textAlign: 'right' },
  gpsBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12, borderWidth: 1 },
  gpsBtnText: { fontSize: 13, fontWeight: '700' as const },
  photoBtn: { borderWidth: 1.5, borderStyle: 'dashed', borderRadius: 14, height: 100, alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoBtnText: { fontSize: 13 },
  photoPreview: { width: '100%', height: 180, borderRadius: 12 },
  removePhoto: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  addProductBtn: { flexDirection: 'row-reverse', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addProductText: { fontSize: 13, fontWeight: '700' as const },
  emptyProducts: { textAlign: 'center', fontSize: 13, paddingVertical: 8 },
  productRow: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 10 },
  productRowHeader: { flexDirection: 'row-reverse', alignItems: 'center', gap: 8 },
  qtyRow: { flexDirection: 'row-reverse', gap: 12 },
  qtyField: { flex: 1, gap: 4 },
  qtyLabel: { fontSize: 11, fontWeight: '700' as const, textAlign: 'center' },
  qtyInput: { borderWidth: 1.5, borderRadius: 10, paddingVertical: 8, fontSize: 15, fontWeight: '700' as const },
  notesInput: { borderWidth: 1.5, borderRadius: 12, padding: 12, minHeight: 80, fontSize: 14 },
  saveFullBtn: { borderRadius: 16, paddingVertical: 18, alignItems: 'center' },
  saveFullBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' as const },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 24, maxHeight: '70%' },
  modalHandle: { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginVertical: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800' as const, textAlign: 'center', marginBottom: 8, paddingHorizontal: 20 },
  modalOption: { padding: 16, borderBottomWidth: 1 },
  modalOptionText: { fontSize: 15, textAlign: 'right' },
  modalCancel: { margin: 16, borderRadius: 14, padding: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 14, fontWeight: '700' as const },
});
