import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, Dimensions, Alert } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, IconButton, Searchbar, Modal, Portal, TextInput, Text, ActivityIndicator, FAB } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../config';
import { shopApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

const { width } = Dimensions.get('window');

interface ProductVariant {
  id: string; // e.g. v_templateId_123 or club_prod_id
  title: string;
  price: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  type: 'printify' | 'club';
  category?: string;
  variants: ProductVariant[];
  inStock: boolean;
  personalization?: {
    supported: boolean;
    hasName?: boolean;
    hasNumber?: boolean;
  };
}

export default function ShopScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Cart
  const [cartId, setCartId] = useState<string | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [checkingOut, setCheckingOut] = useState(false);

  // Selected Product Modal
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [personalization, setPersonalization] = useState({ name: '', number: '' });
  const [addingToCart, setAddingToCart] = useState(false);

  const categories = [
    { id: 'all', label: 'All', icon: '🛍️' },
    { id: 'clothing', label: 'Clothing', icon: '👕' },
    { id: 'accessories', label: 'Accessories', icon: '🧢' },
    { id: 'custom', label: 'Custom', icon: '🎨' },
  ];

  useEffect(() => {
    loadShop();
    loadCart();
  }, []);

  const loadShop = async () => {
    try {
      setLoading(true);
      const data = await shopApi.getProducts();
      // Flatten products
      if (data?.data?.products) {
        const allProducts: Product[] = [
          ...data.data.products.personalized.map((p: any) => ({
            id: p.id,
            name: p.title,
            description: p.description,
            price: (p.variants?.[0]?.price || 0) / 100,
            imageUrl: p.image_url,
            type: 'printify',
            category: 'clothing', // Default for now
            variants: p.variants?.map((v: any) => ({
              id: v.id,
              title: v.title,
              price: v.price / 100
            })) || [],
            inStock: true,
            personalization: { supported: true, hasName: true, hasNumber: true }
          })),
          ...data.data.products.club.map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price, // Club products might already be formatted? Backend uses price_gbp (pence)? 
            // In personalized-shop.ts: price: p.price_gbp / 100. So club products are ALREADY pounds.
            imageUrl: p.imageUrl,
            type: 'club',
            category: p.category,
            variants: [{ id: p.id, title: 'Standard', price: p.price }],
            inStock: p.inStock,
            personalization: { supported: false }
          }))
        ];
        setProducts(allProducts);
      }
    } catch (e) {
      console.error('Failed to load shop', e);
      Alert.alert('Error', 'Could not load products');
    } finally {
      setLoading(false);
    }
  };

  const loadCart = async () => {
    try {
      const storedId = await AsyncStorage.getItem('cart_id');
      if (storedId) {
        setCartId(storedId);
        const res = await shopApi.getCart(storedId);
        if (res?.cart?.items) {
          setCartCount(res.cart.items.length);
        }
      }
    } catch (e) {
      console.log('No active cart');
    }
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariantId(product.variants?.[0]?.id || '');
    setPersonalization({ name: '', number: '' });
  };

  const handleAddToCart = async () => {
    if (!selectedProduct || !selectedVariantId) return;

    setAddingToCart(true);
    try {
      let activeCartId = cartId;
      if (!activeCartId) {
        const res = await shopApi.createCart();
        if (res?.cart?.id) {
          activeCartId = res.cart.id;
          setCartId(activeCartId);
          await AsyncStorage.setItem('cart_id', activeCartId!);
        } else {
          throw new Error('Failed to create cart');
        }
      }

      const persData = selectedProduct.personalization?.supported ? {
        name: personalization.name.toUpperCase(),
        number: personalization.number
      } : undefined;

      await shopApi.addToCart(activeCartId!, selectedVariantId, 1, persData);

      Alert.alert('Success', 'Added to cart');
      setSelectedProduct(null);
      loadCart(); // Refresh count
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to add to cart');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleCheckout = async () => {
    if (!cartId || cartCount === 0) return;
    setCheckingOut(true);
    try {
      const email = user?.email || ''; // Should prompt if empty?
      const res = await shopApi.createCheckoutSession(cartId, email);
      if (res.success && res.url) {
        await Linking.openURL(res.url);
        // Maybe clear cart locally? 
        // Logic: Frontend success page clears it. Mobile app check?
        // For now, let user manually refresh or we clear on return?
        // We'll clear cart ID to force new one next time?
        // Or keep it until they confirm?
        // Let's keep it.
      } else {
        Alert.alert('Error', 'Could not create checkout session');
      }
    } catch (e) {
      Alert.alert('Error', 'Checkout failed');
    } finally {
      setCheckingOut(false);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || (product.category === selectedCategory) || (selectedCategory === 'custom' && product.personalization?.supported);
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Team Shop</Title>
        <Paragraph style={styles.headerSubtitle}>Official Merchandise</Paragraph>
      </View>

      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search items..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map(cat => (
          <Chip
            key={cat.id}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={[styles.categoryChip, selectedCategory === cat.id && styles.categoryChipSelected]}
            textStyle={[styles.categoryChipText, selectedCategory === cat.id && styles.categoryChipTextSelected]}
            selectedColor={COLORS.primary}
          >
            {cat.icon} {cat.label}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollContainer}>
        <View style={styles.productsGrid}>
          {filteredProducts.map(product => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleProductSelect(product)}
            >
              {product.imageUrl ? (
                <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              ) : (
                <View style={[styles.productImage, styles.placeholderImage]}>
                  <Text style={{ fontSize: 40 }}>👕</Text>
                </View>
              )}
              {!product.inStock && (
                <View style={styles.outOfStockOverlay}>
                  <Paragraph style={styles.outOfStockOverlayText}>Out of Stock</Paragraph>
                </View>
              )}
              <View style={styles.productInfo}>
                <Paragraph style={styles.productName} numberOfLines={2}>{product.name}</Paragraph>
                <Paragraph style={styles.productPrice}>£{(product.price).toFixed(2)}</Paragraph>
                {product.personalization?.supported && (
                  <View style={styles.customBadge}>
                    <Text style={styles.customBadgeText}>CUSTOMIZABLE</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Checkout FAB */}
      {cartCount > 0 && (
        <FAB
          icon="cart"
          label={`Checkout (${cartCount})`}
          style={[styles.fab, { bottom: insets.bottom + 20 }]}
          onPress={handleCheckout}
          loading={checkingOut}
          disabled={checkingOut}
        />
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <Portal>
          <Modal visible={true} onDismiss={() => setSelectedProduct(null)} contentContainerStyle={styles.modalContent}>
            <ScrollView>
              <Image source={{ uri: selectedProduct.imageUrl }} style={styles.modalImage} />
              <View style={styles.modalBody}>
                <Title style={styles.modalTitle}>{selectedProduct.name}</Title>
                <Paragraph style={styles.modalPrice}>£{selectedProduct.price.toFixed(2)}</Paragraph>
                <Paragraph style={styles.modalDesc}>{selectedProduct.description}</Paragraph>

                {/* Variants */}
                {selectedProduct.variants.length > 1 && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Select Size/Option:</Text>
                    <View style={styles.chipRow}>
                      {selectedProduct.variants.map(v => (
                        <Chip
                          key={v.id}
                          selected={selectedVariantId === v.id}
                          onPress={() => setSelectedVariantId(v.id)}
                          style={styles.chip}
                        >
                          {v.title}
                        </Chip>
                      ))}
                    </View>
                  </View>
                )}

                {/* Personalization */}
                {selectedProduct.personalization?.supported && (
                  <View style={styles.section}>
                    <Text style={styles.label}>Personalization:</Text>
                    <TextInput
                      label="Name on Back"
                      value={personalization.name}
                      onChangeText={t => setPersonalization(p => ({ ...p, name: t }))}
                      style={styles.input}
                      maxLength={12}
                    />
                    <TextInput
                      label="Number"
                      value={personalization.number}
                      onChangeText={t => setPersonalization(p => ({ ...p, number: t }))}
                      style={styles.input}
                      maxLength={3}
                      keyboardType="numeric"
                    />
                  </View>
                )}

                <Button
                  mode="contained"
                  onPress={handleAddToCart}
                  loading={addingToCart}
                  style={styles.addButton}
                >
                  Add to Cart
                </Button>
                <Button onPress={() => setSelectedProduct(null)} style={{ marginTop: 10 }}>
                  Close
                </Button>
              </View>
            </ScrollView>
          </Modal>
        </Portal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, backgroundColor: COLORS.primary },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: COLORS.secondary },
  headerSubtitle: { fontSize: 14, color: COLORS.secondary, opacity: 0.8 },

  searchContainer: { padding: 16, paddingBottom: 8 },
  searchBar: { elevation: 2 },

  categoryScroll: { paddingHorizontal: 16, maxHeight: 60 },
  categoryChip: { marginRight: 8, backgroundColor: '#FFF', borderWidth: 1, borderColor: COLORS.primary },
  categoryChipSelected: { backgroundColor: COLORS.primary },
  categoryChipText: { color: COLORS.primary },
  categoryChipTextSelected: { color: COLORS.secondary, fontWeight: 'bold' },

  scrollContainer: { flex: 1 },
  productsGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  productCard: { width: (width - 48) / 2, margin: 8, borderRadius: 12, backgroundColor: COLORS.surface, elevation: 2, overflow: 'hidden' },
  productImage: { width: '100%', height: 150, resizeMode: 'cover' },
  placeholderImage: { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' },

  outOfStockOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  outOfStockOverlayText: { color: 'white', fontWeight: 'bold' },

  productInfo: { padding: 12 },
  productName: { fontSize: 13, fontWeight: '500', color: COLORS.text, marginBottom: 4, height: 36 },
  productPrice: { fontSize: 16, fontWeight: 'bold', color: COLORS.primary },
  customBadge: { marginTop: 4, backgroundColor: COLORS.secondary, padding: 2, borderRadius: 4, alignSelf: 'flex-start' },
  customBadgeText: { fontSize: 10, color: COLORS.primary, fontWeight: 'bold' },

  fab: { position: 'absolute', right: 20, backgroundColor: COLORS.primary },

  // Modal
  modalContent: { backgroundColor: 'white', margin: 20, borderRadius: 12, maxHeight: '80%' },
  modalImage: { width: '100%', height: 200, resizeMode: 'cover' },
  modalBody: { padding: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  modalPrice: { fontSize: 20, color: COLORS.primary, fontWeight: 'bold', marginBottom: 12 },
  modalDesc: { color: COLORS.textLight, marginBottom: 20 },

  section: { marginBottom: 16 },
  label: { fontWeight: 'bold', marginBottom: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginRight: 4, marginBottom: 4 },
  input: { marginBottom: 12, backgroundColor: 'white' },
  addButton: { paddingVertical: 6, backgroundColor: COLORS.primary },
});
