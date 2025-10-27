import React, { useState } from 'react';
import { View, ScrollView, StyleSheet, Image, TouchableOpacity, Linking, Dimensions } from 'react-native';
import { Card, Title, Paragraph, Button, Chip, IconButton, Searchbar } from 'react-native-paper';
import { COLORS } from '../config';

const { width } = Dimensions.get('window');

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category: 'clothing' | 'accessories' | 'homeware' | 'custom';
  sizes?: string[];
  colors?: string[];
  inStock: boolean;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Syston Tigers Home Jersey',
    description: 'Official 2024/25 home kit with club badge',
    price: 35,
    imageUrl: 'https://picsum.photos/400/400?random=51',
    category: 'clothing',
    sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Yellow/Black'],
    inStock: true
  },
  {
    id: '2',
    name: 'Training Shirt',
    description: 'Breathable training top with club logo',
    price: 25,
    imageUrl: 'https://picsum.photos/400/400?random=52',
    category: 'clothing',
    sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL'],
    colors: ['Black', 'Yellow'],
    inStock: true
  },
  {
    id: '3',
    name: 'Club Scarf',
    description: 'Knitted scarf in club colors',
    price: 15,
    imageUrl: 'https://picsum.photos/400/400?random=53',
    category: 'accessories',
    inStock: true
  },
  {
    id: '4',
    name: 'Water Bottle',
    description: 'Reusable sports bottle with Tigers logo',
    price: 10,
    imageUrl: 'https://picsum.photos/400/400?random=54',
    category: 'accessories',
    inStock: true
  },
  {
    id: '5',
    name: 'Hooded Jacket',
    description: 'Zip-up hoodie with embroidered badge',
    price: 45,
    imageUrl: 'https://picsum.photos/400/400?random=55',
    category: 'clothing',
    sizes: ['YS', 'YM', 'YL', 'S', 'M', 'L', 'XL', 'XXL'],
    colors: ['Black', 'Yellow', 'Navy'],
    inStock: true
  },
  {
    id: '6',
    name: 'Baseball Cap',
    description: 'Adjustable cap with club logo',
    price: 12,
    imageUrl: 'https://picsum.photos/400/400?random=56',
    category: 'accessories',
    inStock: true
  },
  {
    id: '7',
    name: 'Travel Mug',
    description: 'Insulated mug with Tigers branding',
    price: 18,
    imageUrl: 'https://picsum.photos/400/400?random=57',
    category: 'homeware',
    inStock: false
  },
  {
    id: '8',
    name: 'Custom Photo Print',
    description: 'Your match photo on canvas or poster',
    price: 30,
    imageUrl: 'https://picsum.photos/400/400?random=58',
    category: 'custom',
    inStock: true
  },
];

const PRINTIFY_STORE_URL = 'https://example.printify.com/syston-tigers';

export default function ShopScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const categories = [
    { id: 'all', label: 'All', icon: '🛍️' },
    { id: 'clothing', label: 'Clothing', icon: '👕' },
    { id: 'accessories', label: 'Accessories', icon: '🧢' },
    { id: 'homeware', label: 'Homeware', icon: '🏠' },
    { id: 'custom', label: 'Custom', icon: '🎨' },
  ];

  const filteredProducts = mockProducts.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const openPrintifyStore = () => {
    Linking.openURL(PRINTIFY_STORE_URL);
  };

  const buyProduct = (product: Product) => {
    // Open Printify store to specific product
    Linking.openURL(`${PRINTIFY_STORE_URL}/product/${product.id}`);
  };

  // Product Detail Modal
  if (selectedProduct) {
    return (
      <View style={styles.container}>
        <View style={styles.detailHeader}>
          <IconButton
            icon="arrow-left"
            iconColor={COLORS.secondary}
            size={24}
            onPress={() => setSelectedProduct(null)}
          />
          <Title style={styles.detailHeaderTitle}>Product Details</Title>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={styles.detailContainer}>
          <Image source={{ uri: selectedProduct.imageUrl }} style={styles.detailImage} />

          <View style={styles.detailContent}>
            <View style={styles.detailTitleRow}>
              <Title style={styles.detailTitle}>{selectedProduct.name}</Title>
              {!selectedProduct.inStock && (
                <Chip style={styles.outOfStockChip} textStyle={styles.outOfStockText}>
                  Out of Stock
                </Chip>
              )}
            </View>

            <Paragraph style={styles.detailPrice}>£{selectedProduct.price.toFixed(2)}</Paragraph>
            <Paragraph style={styles.detailDescription}>{selectedProduct.description}</Paragraph>

            {selectedProduct.sizes && (
              <View style={styles.optionSection}>
                <Paragraph style={styles.optionLabel}>Available Sizes:</Paragraph>
                <View style={styles.optionChips}>
                  {selectedProduct.sizes.map(size => (
                    <Chip key={size} style={styles.optionChip}>
                      {size}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            {selectedProduct.colors && (
              <View style={styles.optionSection}>
                <Paragraph style={styles.optionLabel}>Available Colors:</Paragraph>
                <View style={styles.optionChips}>
                  {selectedProduct.colors.map(color => (
                    <Chip key={color} style={styles.optionChip}>
                      {color}
                    </Chip>
                  ))}
                </View>
              </View>
            )}

            <Card style={styles.infoCard}>
              <Card.Content>
                <Title style={styles.infoTitle}>📦 Delivery Information</Title>
                <Paragraph style={styles.infoText}>
                  • UK shipping: 3-5 business days{'\n'}
                  • Free shipping on orders over £50{'\n'}
                  • Returns accepted within 30 days{'\n'}
                  • All items made to order via Printify
                </Paragraph>
              </Card.Content>
            </Card>

            <Button
              mode="contained"
              icon="cart"
              onPress={() => buyProduct(selectedProduct)}
              style={styles.buyButton}
              buttonColor={COLORS.primary}
              textColor={COLORS.secondary}
              disabled={!selectedProduct.inStock}
            >
              {selectedProduct.inStock ? 'Buy Now' : 'Out of Stock'}
            </Button>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Main shop view
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Title style={styles.headerTitle}>Team Shop</Title>
        <Paragraph style={styles.headerSubtitle}>Official merchandise via Printify</Paragraph>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search products..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        {categories.map(cat => (
          <Chip
            key={cat.id}
            selected={selectedCategory === cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={[
              styles.categoryChip,
              selectedCategory === cat.id && styles.categoryChipSelected,
            ]}
            textStyle={[
              styles.categoryChipText,
              selectedCategory === cat.id && styles.categoryChipTextSelected,
            ]}
            selectedColor={COLORS.primary}
          >
            {cat.icon} {cat.label}
          </Chip>
        ))}
      </ScrollView>

      <ScrollView style={styles.scrollContainer}>
        {/* Printify Info Banner */}
        <Card style={styles.bannerCard}>
          <Card.Content>
            <View style={styles.bannerContent}>
              <View style={styles.bannerText}>
                <Title style={styles.bannerTitle}>🎨 Powered by Printify</Title>
                <Paragraph style={styles.bannerDescription}>
                  All products are made to order with high-quality printing
                </Paragraph>
              </View>
              <Button
                mode="outlined"
                onPress={openPrintifyStore}
                compact
              >
                Visit Store
              </Button>
            </View>
          </Card.Content>
        </Card>

        {/* Products Grid */}
        <View style={styles.productsGrid}>
          {filteredProducts.map(product => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => setSelectedProduct(product)}
            >
              <Image source={{ uri: product.imageUrl }} style={styles.productImage} />
              {!product.inStock && (
                <View style={styles.outOfStockOverlay}>
                  <Paragraph style={styles.outOfStockOverlayText}>Out of Stock</Paragraph>
                </View>
              )}
              <View style={styles.productInfo}>
                <Paragraph style={styles.productName} numberOfLines={2}>
                  {product.name}
                </Paragraph>
                <Paragraph style={styles.productPrice}>£{product.price.toFixed(2)}</Paragraph>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredProducts.length === 0 && (
          <View style={styles.emptyState}>
            <Paragraph style={styles.emptyText}>No products found</Paragraph>
            <Paragraph style={styles.emptySubtext}>Try adjusting your search or filters</Paragraph>
          </View>
        )}

        {/* Custom Orders Info */}
        <Card style={styles.customCard}>
          <Card.Content>
            <Title style={styles.customTitle}>🎨 Custom Orders</Title>
            <Paragraph style={styles.customText}>
              Want something unique? We can create custom designs for:
            </Paragraph>
            <View style={styles.customList}>
              <Paragraph style={styles.customItem}>• Player name & number jerseys</Paragraph>
              <Paragraph style={styles.customItem}>• Match photo prints & canvases</Paragraph>
              <Paragraph style={styles.customItem}>• Team group photos</Paragraph>
              <Paragraph style={styles.customItem}>• Commemorative items</Paragraph>
            </View>
            <Button
              mode="contained"
              icon="email"
              onPress={() => Linking.openURL('mailto:shop@systontigers.com?subject=Custom Order Request')}
              style={styles.customButton}
              buttonColor={COLORS.primary}
              textColor={COLORS.secondary}
            >
              Request Custom Order
            </Button>
          </Card.Content>
        </Card>

        {/* Image Post Template Info */}
        <Card style={styles.templateCard}>
          <Card.Content>
            <Title style={styles.templateTitle}>📸 Image Post Templates</Title>
            <Paragraph style={styles.templateText}>
              All our products feature professional designs that look great on social media. When you purchase, you'll receive:
            </Paragraph>
            <View style={styles.templateList}>
              <Paragraph style={styles.templateItem}>✓ High-quality product photos</Paragraph>
              <Paragraph style={styles.templateItem}>✓ Social media templates (Instagram, Facebook, X)</Paragraph>
              <Paragraph style={styles.templateItem}>✓ Hashtags and captions ready to use</Paragraph>
              <Paragraph style={styles.templateItem}>✓ Printify automated fulfillment</Paragraph>
            </View>
          </Card.Content>
        </Card>

        {/* Support Info */}
        <Card style={styles.supportCard}>
          <Card.Content>
            <Title style={styles.supportTitle}>💬 Need Help?</Title>
            <Paragraph style={styles.supportText}>
              Questions about sizing, delivery, or custom orders? Get in touch!
            </Paragraph>
            <View style={styles.supportButtons}>
              <Button
                mode="outlined"
                icon="email"
                onPress={() => Linking.openURL('mailto:shop@systontigers.com')}
                style={styles.supportButton}
              >
                Email
              </Button>
              <Button
                mode="outlined"
                icon="help-circle"
                onPress={openPrintifyStore}
                style={styles.supportButton}
              >
                FAQ
              </Button>
            </View>
          </Card.Content>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.primary,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.secondary,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.secondary,
    opacity: 0.8,
  },
  searchContainer: {
    padding: 16,
    paddingBottom: 8,
  },
  searchBar: {
    elevation: 2,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  categoryChip: {
    marginRight: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  categoryChipSelected: {
    backgroundColor: COLORS.primary,
  },
  categoryChipText: {
    color: COLORS.primary,
  },
  categoryChipTextSelected: {
    color: COLORS.secondary,
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
  },
  bannerCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bannerText: {
    flex: 1,
    marginRight: 12,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  bannerDescription: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
  },
  productCard: {
    width: (width - 48) / 2,
    margin: 8,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    elevation: 2,
    overflow: 'hidden',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockOverlayText: {
    color: COLORS.secondary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
    minHeight: 36,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  customCard: {
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    elevation: 2,
  },
  customTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  customText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  customList: {
    marginVertical: 8,
  },
  customItem: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  customButton: {
    marginTop: 8,
  },
  templateCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  templateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  templateText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  templateList: {
    marginVertical: 8,
  },
  templateItem: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  supportCard: {
    margin: 16,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  supportTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  supportText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  supportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  supportButton: {
    flex: 1,
  },
  // Product detail styles
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.primary,
    paddingRight: 20,
    paddingVertical: 8,
  },
  detailHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.secondary,
  },
  detailContainer: {
    flex: 1,
  },
  detailImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  detailContent: {
    padding: 16,
  },
  detailTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  outOfStockChip: {
    backgroundColor: '#F44336',
  },
  outOfStockText: {
    color: COLORS.secondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  detailPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
    marginBottom: 12,
  },
  detailDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  optionSection: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  optionChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    backgroundColor: COLORS.background,
  },
  infoCard: {
    marginVertical: 16,
    borderRadius: 12,
    elevation: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  buyButton: {
    paddingVertical: 8,
    marginTop: 8,
  },
});
