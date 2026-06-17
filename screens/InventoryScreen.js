import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useStore from '../store/store';
import { formatCurrency } from '../utils/currency';
import { showAlert } from '../utils/alert';

const emptyVariant = () => ({ name: '', price: '' });
const emptyAddon = () => ({ name: '', price: '' });

export default function InventoryScreen() {
  const inventory = useStore((s) => s.inventory);
  const addInventoryItem = useStore((s) => s.addInventoryItem);
  const updateInventoryItem = useStore((s) => s.updateInventoryItem);
  const removeInventoryItem = useStore((s) => s.removeInventoryItem);

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [variants, setVariants] = useState([]);
  const [addons, setAddons] = useState([]);
  const [editingItemId, setEditingItemId] = useState(null);

  const resetForm = () => {
    setName('');
    setBasePrice('');
    setVariants([]);
    setAddons([]);
    setEditingItemId(null);
  };

  const beginEdit = (item) => {
    setEditingItemId(item.id);
    setName(item.name || '');
    setBasePrice(item.basePrice === 0 ? '0' : String(item.basePrice ?? ''));
    setVariants(
      (item.variants || []).map((v) => ({
        name: v.name || '',
        price: v.price === 0 ? '0' : String(v.price ?? ''),
      }))
    );
    setAddons(
      (item.addons || []).map((a) => ({
        name: a.name || '',
        price: a.price === 0 ? '0' : String(a.price ?? ''),
      }))
    );
  };

  const updateListItem = (list, setList, index, field, value) => {
    setList(list.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const removeListItem = (list, setList, index) => {
    setList(list.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!name.trim()) {
      showAlert('Validation', 'Item name is required.');
      return;
    }
    if (basePrice === '' || isNaN(Number(basePrice)) || Number(basePrice) < 0) {
      showAlert('Validation', 'Enter a valid base price.');
      return;
    }

    const parsedVariants = variants.filter((v) => v.name.trim());
    for (const v of parsedVariants) {
      if (v.price === '' || isNaN(Number(v.price)) || Number(v.price) < 0) {
        showAlert('Validation', `Invalid price for variant "${v.name}".`);
        return;
      }
    }

    const parsedAddons = addons.filter((a) => a.name.trim());
    for (const a of parsedAddons) {
      if (a.price === '' || isNaN(Number(a.price)) || Number(a.price) < 0) {
        showAlert('Validation', `Invalid price for add-on "${a.name}".`);
        return;
      }
    }

    if (editingItemId) {
      updateInventoryItem(editingItemId, {
        name,
        basePrice,
        variants: parsedVariants,
        addons: parsedAddons,
      });
      const updatedName = name.trim();
      resetForm();
      showAlert('Updated', `"${updatedName}" updated.`);
      return;
    }

    addInventoryItem({
      name,
      basePrice,
      variants: parsedVariants,
      addons: parsedAddons,
    });
    const savedName = name.trim();
    resetForm();
    showAlert('Saved', `"${savedName}" added to inventory.`);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.heading}>{editingItemId ? 'Edit Menu Item' : 'New Menu Item'}</Text>

          <Text style={styles.label}>Item Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="e.g. Coffee"
            placeholderTextColor="#adb5bd"
          />

          <Text style={styles.label}>Base Price (Rs)</Text>
          <TextInput
            style={styles.input}
            value={basePrice}
            onChangeText={setBasePrice}
            placeholder="0.00"
            keyboardType="decimal-pad"
            placeholderTextColor="#adb5bd"
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Variants</Text>
            <TouchableOpacity
              style={styles.addChip}
              onPress={() => setVariants([...variants, emptyVariant()])}
            >
              <Text style={styles.addChipText}>+ Add Variant</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Variant price replaces the base price.</Text>

          {variants.map((variant, index) => (
            <View key={`variant-${index}`} style={styles.dynamicRow}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={variant.name}
                onChangeText={(v) => updateListItem(variants, setVariants, index, 'name', v)}
                placeholder="Size name"
                placeholderTextColor="#adb5bd"
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={variant.price}
                onChangeText={(v) => updateListItem(variants, setVariants, index, 'price', v)}
                placeholder="Price"
                keyboardType="decimal-pad"
                placeholderTextColor="#adb5bd"
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeListItem(variants, setVariants, index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Add-ons</Text>
            <TouchableOpacity
              style={styles.addChip}
              onPress={() => setAddons([...addons, emptyAddon()])}
            >
              <Text style={styles.addChipText}>+ Add Add-on</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.hint}>Add-on price is added on top of variant/base price.</Text>

          {addons.map((addon, index) => (
            <View key={`addon-${index}`} style={styles.dynamicRow}>
              <TextInput
                style={[styles.input, styles.flexInput]}
                value={addon.name}
                onChangeText={(v) => updateListItem(addons, setAddons, index, 'name', v)}
                placeholder="Add-on name"
                placeholderTextColor="#adb5bd"
              />
              <TextInput
                style={[styles.input, styles.priceInput]}
                value={addon.price}
                onChangeText={(v) => updateListItem(addons, setAddons, index, 'price', v)}
                placeholder="+Price"
                keyboardType="decimal-pad"
                placeholderTextColor="#adb5bd"
              />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => removeListItem(addons, setAddons, index)}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <View style={styles.saveRow}>
            {editingItemId ? (
              <TouchableOpacity style={styles.cancelEditBtn} onPress={resetForm}>
                <Text style={styles.cancelEditText}>Cancel</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{editingItemId ? 'Update Item' : 'Save Item'}</Text>
            </TouchableOpacity>
          </View>

          {inventory.length > 0 && (
            <View style={styles.listSection}>
              <Text style={styles.listHeading}>Saved Items ({inventory.length})</Text>
              {inventory.map((item) => (
                <View key={item.id} style={styles.savedCard}>
                  <View style={styles.savedInfo}>
                    <Text style={styles.savedId}>ID: {item.itemNumber}</Text>
                    <Text style={styles.savedName}>{item.name}</Text>
                    {item.category ? <Text style={styles.savedCategory}>{item.category}</Text> : null}
                    <Text style={styles.savedMeta}>
                      {formatCurrency(item.basePrice)} · {item.variants.length} variants ·{' '}
                      {item.addons.length} add-ons
                    </Text>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => beginEdit(item)}>
                      <Text style={styles.editLink}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => removeInventoryItem(item.id)}>
                      <Text style={styles.deleteLink}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fa' },
  flex: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 32 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1a1a2e',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#16213e',
  },
  addChip: {
    backgroundColor: '#e94560',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  addChipText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  hint: {
    fontSize: 12,
    color: '#868e96',
    marginBottom: 10,
  },
  dynamicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  flexInput: { flex: 1 },
  priceInput: { width: 90 },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffe3e3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#e03131',
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#1a1a2e',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 28,
    flex: 1,
  },
  saveBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
  },
  saveRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  cancelEditBtn: {
    flex: 1,
    backgroundColor: '#f1f3f5',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dee2e6',
  },
  cancelEditText: {
    color: '#495057',
    fontSize: 17,
    fontWeight: '700',
  },
  listSection: { marginTop: 32 },
  listHeading: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  savedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  savedInfo: { flex: 1 },
  savedId: {
    fontSize: 11,
    fontWeight: '700',
    color: '#868e96',
    marginBottom: 2,
  },
  savedName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  savedCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e94560',
    marginTop: 2,
  },
  savedMeta: {
    fontSize: 13,
    color: '#868e96',
    marginTop: 2,
  },
  cardActions: {
    alignItems: 'flex-end',
    gap: 10,
  },
  editLink: {
    color: '#228be6',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteLink: {
    color: '#e03131',
    fontSize: 14,
    fontWeight: '600',
  },
});
