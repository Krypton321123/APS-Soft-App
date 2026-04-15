import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
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
import { SafeAreaView } from 'react-native-safe-area-context';
import ky from 'ky';
import { API_URL } from '../../constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Define TypeScript interfaces
interface Item {
  itmcd: string;
  itmnm: string;
  itmrate: number;
}

interface OrderDetail {
  itmcd: string;
  itmnm: string;
  rate: number;
  qty: number;
  amount: number;
}

type PaymentMode = 'cash' | 'credit';

interface OrderParams {
  partyId: string;
  partyName: string;
}

interface OrderQuantities {
  [key: string]: number;
}

interface InputQuantities {
  [key: string]: string;
}

const Order: React.FC = () => {
  const router = useRouter();
  const { partyId, partyName, userId } = useLocalSearchParams<any>();
  
  const [orderQuantities, setOrderQuantities] = useState<OrderQuantities>({});
  // Store input values as strings to fix the first digit skipping issue
  const [inputQuantities, setInputQuantities] = useState<InputQuantities>({});
  const [discount, setDiscount] = useState<string>('0');
  // Stable discount change handler using useRef
  const handleDiscountChange = useRef((text: string) => {
    // Only allow numbers, strip non-digits
    setDiscount(text.replace(/[^0-9]/g, ''));
  }).current;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const flatListRef = useRef<FlatList<Item> | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;
  const discountInputRef = useRef<TextInput | null>(null);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [creditDays, setCreditDays] = useState<string>('');
  const [consumerRate, setConsumerRate] = useState(); 
  const [bulkRate, setBulkRate] = useState(); 

  useEffect(() => {
    const fetchTodayOrders = async () => {
      try {
        const response = await ky.get(`${API_URL}/orders/today/${partyId}`).json<{
          success: boolean;
          data?: {
            orderItems: {
              itemCode: string;
              quantity: number;
            }[];
          }[];
        }>();

        if (response.success && response.data && response.data.length > 0) {
          // Get the latest order from today
          const latestOrder: any = response.data[0];
          
          // Create a new quantities object
          const newOrderQuantities: OrderQuantities = {};
          const newInputQuantities: InputQuantities = {};
          
          // Populate quantities from the order items
          latestOrder.orderItems.forEach((item: any) => {
            newOrderQuantities[item.itemCode] = item.quantity;
            newInputQuantities[item.itemCode] = item.quantity.toString();
          });
          
          // Set the quantities
          setOrderQuantities(newOrderQuantities);
          setInputQuantities(newInputQuantities);
          
          // Set discount if it exists
          if (latestOrder.discountAmount) {
            setDiscount(latestOrder.discountAmount.toString());
          }
        }
      } catch (error) {
        console.error('Error fetching today\'s orders:', error);
      }
    };

    if (partyId) {
      fetchTodayOrders();
    }
  }, [partyId]);

  // Header animation values
  const headerTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -40],
    extrapolate: 'clamp',
  });

  const orderSummaryOpacity = scrollY.interpolate({
    inputRange: [0, 60, 90],
    outputRange: [1, 0.8, 0],
    extrapolate: 'clamp',
  });

  useEffect(() => {
    fetchItems()
  }, [searchTerm]);

  

  const fetchItems = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await ky.post(`${API_URL}/user/getItems`, {json: {userId}}).json<any>();
      console.log(response)
      if (response.success && response.data) {
        setItems(response.data.items);
        console.log(response.data.consumerRate)
        console.log(response.data.bulkRate)
        setConsumerRate(response.data.consumerRate)
        setBulkRate(response.data.bulkRate)
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
    // Store the raw input value as a string
    setInputQuantities(prev => ({ ...prev, [itmcd]: qty }));
    
    // Parse the quantity for calculations
    const quantity = parseInt(qty) || 0;
    if (quantity <= 999) {
      setOrderQuantities(prev => ({ ...prev, [itmcd]: quantity }));
    }
  };

  const filteredItems = items.filter((item) =>
    item.itmnm.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalQty = Object.values(orderQuantities).reduce((acc, val) => acc + val, 0);
  
  const totalAmount = items.reduce(
    (acc, item) => acc + (orderQuantities[item.itmcd] || 0) * item.itmrate,
    0
  );

  const discountValue = parseFloat(discount) || 0;
  const discountedAmount = Math.max(0, totalAmount - discountValue);

  const handleSave = async (): Promise<void> => {
    try {
      setSaving(true);
      
      const orderDetails: OrderDetail[] = items
        .map((item) => ({
          itmcd: item.itmcd,
          itmnm: item.itmnm,
          rate: item.itmrate,
          qty: orderQuantities[item.itmcd] || 0,
          amount: (orderQuantities[item.itmcd] || 0) * item.itmrate,
        }))
        .filter((item) => item.qty > 0);
  
      if (orderDetails.length === 0) {
        alert('Please add at least one item to the order');
        setSaving(false);
        return;
      }
  
      // Create the order payload
      const orderPayload = {
        partyId,
        partyName,
        empId: userId,
        totalAmount,
        paymentMode, 
        consumerRate, 
        bulkRate,
        creditDays: paymentMode === 'credit' ? parseInt(creditDays) : 0,
        discountAmount: parseFloat(discount) || 0,
        orderItems: orderDetails
      };
  
      // Make API call to save the order
      const response = await ky.post(`${API_URL}/orders/create`, {
        json: orderPayload
      }).json();
  
      alert('Order saved successfully!');
      router.back();
    } catch (error) {
      console.error('Error saving order:', error);
      alert('Failed to save order. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Function to handle discount input focus to prevent keyboard from dismissing
  const handleDiscountFocus = (): void => {
    // Automatically select all text when focusing on the discount input
    if (discountInputRef.current) {
      discountInputRef.current.setNativeProps({ selection: { start: 0, end: discount.length } });
    }
  };

  const ListHeaderComponent = (): JSX.Element => {
    return (
      <View className="py-2">
        <View className="bg-white mx-4 my-2 rounded-xl shadow-sm p-4">
          <Text className="text-gray-500 font-medium mb-2">Order Summary</Text>
          <View className="flex-row justify-between">
            <View className="items-center bg-indigo-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">ITEMS</Text>
              <Text className="text-indigo-700 font-bold text-base">
                {Object.values(orderQuantities).filter((qty) => qty > 0).length} / {items.length}
              </Text>
            </View>
            <View className="items-center bg-emerald-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">QUANTITY</Text>
              <Text className="text-emerald-700 font-bold text-base">
                {totalQty}
              </Text>
            </View>
            <View className="items-center bg-amber-50 px-4 py-2 rounded-lg">
              <Text className="text-gray-500 text-xs">AMOUNT</Text>
              <Text className="text-amber-700 font-bold text-base">
                ₹{totalAmount}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Column Headers */}
        {filteredItems.length > 0 && (
          <View className="flex-row items-center bg-indigo-50 py-3 px-4 mx-4 my-1 rounded-t-xl">
            <View className="flex-1 pr-2">
              <Text className="text-indigo-800 font-medium text-sm">
                Item Name
              </Text>
            </View>
            <View className="flex-row items-center justify-end">
              <Text className="text-indigo-800 text-sm ml-8 w-16 text-center">
                Price
              </Text>
              <Text className="text-indigo-800 text-sm mx-4 w-16 text-center">
                Qty
              </Text>
              <Text className="text-indigo-800 text-sm min-w-[60px] text-right">
                Amount
              </Text>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderItem = ({ item, index }: ListRenderItemInfo<Item>): JSX.Element => {
    const amount = (orderQuantities[item.itmcd] || 0) * item.itmrate;
    const isItemSelected = (orderQuantities[item.itmcd] || 0) > 0;
    
    return (
      <TouchableOpacity 
        activeOpacity={0.7}
        onPress={() => {
          const currentQty = orderQuantities[item.itmcd] || 0;
          const newQty = currentQty + 1;
          handleQuantityChange(item.itmcd, newQty.toString());
        }}
        className={`flex-row items-center py-3 px-4 mx-4 mb-1 bg-white rounded-none ${
          index === filteredItems.length - 1 ? 'rounded-b-xl' : ''
        } shadow-sm ${isItemSelected ? 'border-l-4 border-indigo-500' : ''}`}
      >
        <View className="flex-1 pr-12">
          <Text className="text-gray-800 font-medium text-sm w-52" numberOfLines={1} ellipsizeMode="tail">
            {item.itmnm}
          </Text>
          <Text className="text-gray-400 text-xs mt-1 whitespace-nowrap h-12 w-20 ">#{item.itmcd}</Text>
        </View>
        
        <View className="flex-row items-center justify-end">
          <Text className="text-gray-700 text-sm ml-8 w-16 text-center">
            ₹{item.itmrate}
          </Text>
          
          <TextInput
            className="text-center w-16 text-sm bg-gray-50 rounded-lg border border-gray-200 py-1 mx-4"
            keyboardType="numeric"
            value={inputQuantities[item.itmcd] || ''}
            onChangeText={(text) => handleQuantityChange(item.itmcd, text)}
            maxLength={3}
          />
          
          <Text className="ml-2 font-medium text-gray-800 text-sm min-w-[60px] text-right">
            ₹{amount}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const ListFooterComponent = (): JSX.Element | null => {
    if (filteredItems.length === 0) return null;
    
    return (
      <View className="pb-32">
        <View className="bg-white mx-4 my-2 rounded-xl shadow-sm p-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-gray-700 font-medium">Subtotal</Text>
            <Text className="text-gray-800 font-medium">₹{totalAmount}</Text>
          </View>
          
      
<View className="flex-row justify-between items-center pb-3 border-b border-gray-100">
  <Text className="text-gray-700">Discount</Text>
  <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
        <Text className="text-gray-500">₹</Text>
          <TextInput
            ref={discountInputRef}
            className="w-20 py-1 text-right text-sm"
            keyboardType="numeric"
            value={discount}
            onChangeText={handleDiscountChange}
            maxLength={6}
            blurOnSubmit={false}
            importantForAutofill="no"
            autoCorrect={false}
          />
  </View>
</View>
          
          <View className="flex-row justify-between items-center pt-3">
            <Text className="text-gray-800 font-medium text-base">Total Amount</Text>
            <Text className="text-gray-800 font-medium text-base">₹{totalAmount}</Text>
          </View>
          
          <View className="flex-row justify-between items-center pt-3">
            <Text className="text-gray-800 font-medium text-base">Discount Amount</Text>
            <Text className="text-indigo-700 font-bold text-lg">₹{discountValue}</Text>
          </View>
          
          {/* Payment Mode Section */}
          <View className="flex-row justify-between items-center pb-3 border-b border-gray-100 mt-4">
            <Text className="text-gray-700">Payment Mode</Text>
            <View className="flex-row items-center space-x-4">
              <TouchableOpacity 
                className={`flex-row items-center ${paymentMode === 'cash' ? 'bg-indigo-100' : 'bg-gray-50'} px-3 py-2 rounded-lg`}
                onPress={() => setPaymentMode('cash')}
              >
                <Ionicons 
                  name={paymentMode === 'cash' ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={paymentMode === 'cash' ? '#4F46E5' : '#6B7280'} 
                />
                <Text className={`ml-2 ${paymentMode === 'cash' ? 'text-indigo-700' : 'text-gray-600'}`}>Cash</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className={`flex-row items-center ${paymentMode === 'credit' ? 'bg-indigo-100' : 'bg-gray-50'} px-3 py-2 rounded-lg`}
                onPress={() => setPaymentMode('credit')}
              >
                <Ionicons 
                  name={paymentMode === 'credit' ? 'radio-button-on' : 'radio-button-off'} 
                  size={18} 
                  color={paymentMode === 'credit' ? '#4F46E5' : '#6B7280'} 
                />
                <Text className={`ml-2 ${paymentMode === 'credit' ? 'text-indigo-700' : 'text-gray-600'}`}>Credit</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Credit Days Input */}
          {paymentMode === 'credit' && (
            <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
              <Text className="text-gray-700">Credit Days</Text>
              <View className="flex-row items-center bg-gray-50 border border-gray-200 rounded-lg px-2">
                <TextInput
                  className="w-20 py-1 text-right text-sm"
                  keyboardType="numeric"
                  value={creditDays}
                  onChangeText={(text) => setCreditDays(text.replace(/[^0-9]/g, ''))}
                  maxLength={3}
                  placeholder="Enter days"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>
          )}
        </View>
      </View>
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
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1">
            {/* Fixed Header - Using static styling instead of animated height */}
            <Animated.View 
              style={{
                transform: [{ translateY: headerTranslateY }]
              }}
              className="bg-indigo-600 px-4 pt-6 pb-3 shadow-md"
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-xl font-bold">New Order</Text>
                  <Text className="text-indigo-200 text-sm mt-1">
                    {partyName} <Text className="text-xs opacity-80">ID: {partyId}</Text>
                  </Text>
                </View>
                <View className="bg-indigo-500 p-2 rounded-full">
                  <Ionicons name="receipt-outline" size={22} color="white" />
                </View>
              </View>

              <Animated.View 
                style={{ opacity: orderSummaryOpacity }} 
                className="pt-2"
              >
                <View className="flex-row justify-between mb-2">
                     <Text className="text-white">Consumer Rate: <Text className="font-bold">₹{consumerRate}</Text></Text>
                    <Text className="text-white">Bulk Rate: <Text className="font-bold">₹{bulkRate}</Text></Text>
                   
               
                </View>
              </Animated.View>

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

            {/* Main Content */}
            <Animated.FlatList
              ref={flatListRef}
              data={filteredItems}
              renderItem={renderItem}
              keyExtractor={(item) => item.itmcd}
              ListHeaderComponent={ListHeaderComponent}
              ListFooterComponent={ListFooterComponent}
              ListEmptyComponent={EmptyListComponent}
              initialNumToRender={10}
              maxToRenderPerBatch={10}
              windowSize={10}
              removeClippedSubviews={true}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={{ 
                paddingBottom: Platform.OS === 'android' ? 120 : 100,
                flexGrow: filteredItems.length === 0 ? 1 : undefined,
              }}
              style={{ flex: 1 }}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
            />
            
            {/* Footer Actions */}
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
                      <Text className="ml-2 text-white font-semibold text-sm">Save Order</Text>
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

export default Order;
