import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ListRenderItemInfo,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import ky from 'ky';
import { API_URL } from '../../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUserId } from '@/store/userIdStore';

// Define TypeScript interfaces
interface Item {
  itmcd: string;
  itmnm: string;
  itmrate: number;
}

interface StockQuantities {
  [key: string]: number;
}

interface InputQuantities {
  [key: string]: string;
}

const Stock = () => {
  const router = useRouter();
  const { partyId, partyName } = useLocalSearchParams<any>();
  console.log(partyId, partyName)
  const [stockQuantities, setStockQuantities] = useState<StockQuantities>({});
  const [inputQuantities, setInputQuantities] = useState<InputQuantities>({});
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const flatListRef = useRef<FlatList<Item> | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const { userId } = useUserId(); 

  // Header animation values
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log("userid ->", userId)
      const response = await ky.post(`${API_URL}/user/getItems`, {json: {userId}}).json<{
        success: boolean;
        data: {
          items: Item[]
        };
      }>();
      
      console.log(response)

      if (response.success && response.data) {
        setItems(response.data.items);
      } else {
        setError('Failed to fetch items');
      }
    } catch (err) {
      setError('Error connecting to server');
      console.error('Error fetching items:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuantityChange = (itmcd: string, qty: string): void => {
    setInputQuantities(prev => ({ ...prev, [itmcd]: qty }));
    const quantity = parseInt(qty) || 0;
    if (quantity <= 999) {
      setStockQuantities(prev => ({ ...prev, [itmcd]: quantity }));
    }
  };

  const filteredItems = items.filter((item) =>
    item.itmnm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQty = Object.values(stockQuantities).reduce((acc, val) => acc + val, 0);

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      
      const stockDetails = items
        .map((item) => ({
          itmcd: item.itmcd,
          itmnm: item.itmnm,
          qty: stockQuantities[item.itmcd] || 0,
        }))
        .filter((item) => item.qty > 0);
  
      if (stockDetails.length === 0) {
        alert('Please add at least one item to the stock');
        setSaving(false);
        return;
      }
  
      const stockPayload = {
        partyId,
        partyName,
        empId: userId,
        stockItems: stockDetails
      };
  
      // Make API call to save the stock
      const response = await ky.post(`${API_URL}/stock/update`, {
        json: stockPayload
      }).json();
  
      alert('Stock updated successfully!');
      router.back();
    } catch (error) {
      console.error('Error updating stock:', error);
      alert('Failed to update stock. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const ListHeaderComponent = (): JSX.Element => {
    return (
      <View className="py-2">
        <View className="bg-white mx-4 my-2 rounded-xl shadow-sm p-4">
          <Text className="text-gray-500 font-medium mb-2">Stock Summary</Text>
          <View className="flex-row justify-between">
            <View className="items-center bg-indigo-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">ITEMS</Text>
              <Text className="text-indigo-700 font-bold text-base">
                {Object.values(stockQuantities).filter((qty) => qty > 0).length} / {items.length}
              </Text>
            </View>
            <View className="items-center bg-emerald-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">TOTAL QTY</Text>
              <Text className="text-emerald-700 font-bold text-base">
                {totalQty}
              </Text>
            </View>
          </View>
        </View>
        
        {filteredItems.length > 0 && (
          <View className="flex-row items-center bg-indigo-50 py-3 px-4 mx-4 my-1 rounded-t-xl">
            <View className="flex-1 pr-2">
              <Text className="text-indigo-800 font-medium text-sm">
                Item Name
              </Text>
            </View>
            <View className="flex-row items-center">
              <Text className="text-indigo-800 text-sm w-16 text-center">
                Qty
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<Item>): JSX.Element => {
    const isItemSelected = (stockQuantities[item.itmcd] || 0) > 0;
    
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          const currentQty = stockQuantities[item.itmcd] || 0;
          const newQty = currentQty + 1;
          handleQuantityChange(item.itmcd, newQty.toString());
        }}
        className={`flex-row items-center py-3 px-4 mx-4 mb-1 bg-white rounded-none ${
          index === filteredItems.length - 1 ? 'rounded-b-xl' : ''
        } shadow-sm ${isItemSelected ? 'border-l-4 border-indigo-500' : ''}`}
      >
        <View className="flex-1 pr-2">
          <Text className="text-gray-800 font-medium text-sm" numberOfLines={3}>
            {item.itmnm}
          </Text>
          <Text className="text-gray-400 text-xs mt-1">#{item.itmcd}</Text>
        </View>
        
        <View className="flex-row items-center">
          <TextInput
            className="text-center w-16 text-sm bg-gray-50 rounded-lg border border-gray-200 py-1"
            keyboardType="numeric"
            value={inputQuantities[item.itmcd] || ''}
            onChangeText={(text) => handleQuantityChange(item.itmcd, text)}
            maxLength={3}
            onFocus={() => {
              const itemIndex = filteredItems.findIndex(i => i.itmcd === item.itmcd);
              if (itemIndex !== -1 && flatListRef.current) {
                flatListRef.current.scrollToIndex({
                  index: itemIndex,
                  animated: true,
                  viewPosition: 0.5 // This positions the item in the middle of the screen
                });
              }
            }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  const EmptyListComponent = (): JSX.Element => (
    <View className="flex-1 justify-center items-center py-16 mx-4 bg-white rounded-xl shadow-sm">
      {isLoading ? (
        <>
          <ActivityIndicator size="large" color="#6366F1" />
          <Text className="text-gray-500 mt-4">Loading items...</Text>
        </>
      ) : error ? (
        <>
          <Ionicons name="alert-circle-outline" size={40} color="#EF4444" />
          <Text className="text-gray-700 mt-4 text-center">{error}</Text>
          <TouchableOpacity
            className="mt-6 bg-indigo-100 px-6 py-3 rounded-full"
            onPress={fetchItems}
          >
            <Text className="text-indigo-700 font-medium">Try Again</Text>
          </TouchableOpacity>
        </>
      ) : searchTerm ? (
        <>
          <Ionicons name="search-outline" size={40} color="#9CA3AF" />
          <Text className="text-gray-500 mt-4">No matching items found</Text>
          <TouchableOpacity
            className="mt-6 bg-indigo-100 px-6 py-3 rounded-full"
            onPress={() => setSearchTerm('')}
          >
            <Text className="text-indigo-700 font-medium">Clear Search</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Ionicons name="cart-outline" size={40} color="#9CA3AF" />
          <Text className="text-gray-500 mt-4">No items available</Text>
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar backgroundColor="#4F46E5" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1">
            <Animated.View 
              style={{
                transform: [{ translateY: headerTranslateY }]
              }}
              className="bg-indigo-600 px-4 pt-6 pb-3 shadow-md"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-xl font-bold">Stock Update</Text>
                  <Text className="text-indigo-200 text-sm mt-1">
                    {partyName} <Text className="text-xs opacity-80">ID: {partyId}</Text>
                  </Text>
                </View>
                <View className="bg-indigo-500 p-2 rounded-full">
                  <Ionicons name="cube-outline" size={22} color="white" />
                </View>
              </View>

              <View className="bg-white mt-2 rounded-lg flex-row items-center px-4 py-2 shadow-sm border border-gray-200">
                <Ionicons name="search" size={18} color="#6366F1" />
                <TextInput
                  className="ml-2 flex-1 text-gray-800 text-sm"
                  placeholder="Search items..."
                  value={searchTerm}
                  onChangeText={setSearchTerm}
                  placeholderTextColor="#9CA3AF"
                  returnKeyType="search"
                />
                {searchTerm ? (
                  <TouchableOpacity onPress={() => setSearchTerm('')}>
                    <Ionicons name="close-circle" size={18} color="#6366F1" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </Animated.View>

            <Animated.FlatList
              ref={flatListRef}
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.itmcd}
              ListHeaderComponent={ListHeaderComponent}
              ListEmptyComponent={EmptyListComponent}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="interactive"
              contentContainerStyle={{ 
                paddingBottom: Platform.OS === 'android' ? 180 : 160,
                flexGrow: filteredItems.length === 0 ? 1 : undefined,
              }}
              style={{ flex: 1 }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              getItemLayout={(data, index) => ({
                length: 80, // Approximate height of each item
                offset: 80 * index,
                index,
              })}
            />
            
            <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 py-4 px-4 shadow-md">
              <View className="flex-row justify-between">
                <TouchableOpacity
                  className="bg-gray-200 flex-row items-center justify-center rounded-full px-4 py-3 w-[45%]"
                  onPress={() => router.back()}
                  disabled={saving}
                >
                  <Ionicons name="arrow-back" size={18} color="#4B5563" />
                  <Text className="ml-2 text-gray-700 font-semibold text-sm">Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  className={`flex-row items-center justify-center rounded-full px-4 py-3 w-[45%] ${saving ? "bg-indigo-400" : "bg-indigo-600"}`}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="ml-2 text-white font-semibold text-sm">Saving</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="save-outline" size={18} color="white" />
                      <Text className="ml-2 text-white font-semibold text-sm">Update Stock</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default Stock;