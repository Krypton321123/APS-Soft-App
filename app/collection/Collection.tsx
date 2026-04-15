import {
  Text,
  View,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Alert,
  Image,
  Modal,
  ToastAndroid,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useRef, useEffect, createRef } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Entypo, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../../constants";
import { CameraView, useCameraPermissions } from "expo-camera";
import ky from "ky";
import useTimer from "@/hooks/useTimer";
import { KeyboardAvoidingView, Platform } from "react-native";

type PaymentMethod = "cash" | "cheque" | "online" | null;

const Collection = () => {
  const { partyId, partyName } = useLocalSearchParams();

  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [userId, setUserId] = useState<string>("");
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""]);
  const references = useRef<any>([]);
  const [otpScreen, setOtpScreen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [submitOTPLoading, setSubmitOTPLoading] = useState(false);
  const [isNumberNotAvailable, setIsNumberNotAvailable] = useState(false);
  const { formattedTime, reset } = useTimer({
    initialTime: 300,
    onComplete: () => {
      Alert.alert("Time expired", "OTP Time expired, please regenerate");
      reset();
    },
    isActive: otpScreen,
  });

  useEffect(() => {
    references.current = otp.map(
      (_, i) => references.current[i] ?? createRef(),
    );
  }, [otp.length]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [amount, setAmount] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");
  const [bankName, setBankName] = useState("");
  const [transactionId, setTransactionId] = useState("");

  // Get userId from AsyncStorage
  useEffect(() => {
    const getUserId = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem("userId");
        if (storedUserId) {
          setUserId(storedUserId);
        }
      } catch (error) {
        console.error("Error retrieving userId from AsyncStorage:", error);
      }
    };

    getUserId();
  }, []);

  // Add new states for images and camera
  const [chequeImage, setChequeImage] = useState("");
  const [onlinePaymentImage, setOnlinePaymentImage] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFor, setCameraFor] = useState<"cheque" | "online" | null>(null);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    (async () => {
      if (!permission?.granted) {
        await requestPermission();
      }
    })();
  }, []);

  const takePhoto = async (type: "cheque" | "online") => {
    setCameraFor(type);
    setCameraActive(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      handlePictureTaken(photo);
    }
  };

  const handlePictureTaken = (photo: { uri: string }) => {
    if (cameraFor === "cheque") {
      setChequeImage(photo.uri);
    } else if (cameraFor === "online") {
      setOnlinePaymentImage(photo.uri);
    }
    setCameraActive(false);
    setCameraFor(null);
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      aspect: [4, 3],
      quality: 1,
    });

    if (result.canceled) {
      return ToastAndroid.show("Canceled image picker", ToastAndroid.SHORT);
    }

    setOnlinePaymentImage(result.assets[0].uri);
  };

  const handleCancelOtp = async () => {
    try {
      const response: any = await ky
        .post(`${API_URL}/otp/cancel`, {
          json: {
            userId,
          },
        })
        .json();

      console.log(response);

      if (response.statusCode === 200) {
        Alert.alert("Success", "Successfully cancelled OTP.");
        return setOtpScreen(false);
      }
    } catch (err) {
      return Alert.alert("Failed", "Failed to cancel OTP request.");
    }
  };

  const handleConfirm = async () => {
    console.log(paymentMethod);
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (
      paymentMethod === "cheque" &&
      (!chequeNumber || !chequeDate || !bankName || !chequeImage)
    ) {
      Alert.alert(
        "Error",
        "Please fill all cheque details and add cheque photo",
      );
      return;
    }

    if (paymentMethod === "online" && (!transactionId || !onlinePaymentImage)) {
      Alert.alert(
        "Error",
        "Please fill all online payment details and add payment screenshot",
      );
      return;
    }

    if (!userId) {
      Alert.alert("Error", "User ID not found. Please login again.");
      return;
    }

    try {
      setConfirmLoading(true);
      const response: any = await ky
        .post(`${API_URL}/collections/generateOtp`, {
          json: {
            userId,
            partyId,
            amount,
            mode: paymentMethod,
            props: {
              transactionId,
              chequeNumber,
            },
          },
        })
        .json();

      console.log(response);

      if (response.statusCode === 200) {
        return setOtpScreen(true);
      } else if (response.statusCode === 202) {
        setIsNumberNotAvailable(true);
        return Alert.alert("Error", "Number not available");
      } else if (response.statusCode === 201) {
        return Alert.alert(
          "Error",
          `You already submitted collection RS.${amount} for today`,
        );
      } else {
        return Alert.alert("Error", "OTP not generated successfully");
      }
    } catch (err) {
      console.log("error ->", err);
      return Alert.alert("Error", "unexpected error came");
    } finally {
      setConfirmLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (otp.join("").length !== 6) return;

    setSubmitOTPLoading(true);

    try {
      const formData = new FormData();

      formData.append("partyId", partyId as string);
      formData.append("partyName", partyName as string);
      formData.append("empId", userId);
      formData.append("amount", parseFloat(amount).toString());
      formData.append("paymentMethod", paymentMethod as string);
      formData.append("otp", otp.join(""));
      if (paymentMethod === "cheque") {
        formData.append("chequeNumber", chequeNumber);
        formData.append("chequeDate", chequeDate);
        formData.append("bankName", bankName);
      } else if (paymentMethod === "online") {
        formData.append("transactionId", transactionId);
      }
      if (paymentMethod === "cheque" || paymentMethod === "online") {
        const imageUri =
          paymentMethod === "cheque" ? chequeImage : onlinePaymentImage;
        const finalName = imageUri.split("/").pop();
        formData.append("photo", {
          uri: imageUri,
          type: "image/jpeg",
          name: finalName,
        } as any);
      }

      const response = await fetch(`${API_URL}/collections/createByMult`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save collection");
      }

      console.log("Collection saved:", data);

      Alert.alert("Success", "Collection saved successfully!", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error: any) {
      console.error("Error saving collection:", error);
      Alert.alert(
        "Error",
        error.message || "Failed to save collection. Please try again.",
      );
    } finally {
      // setOtpScreen(false)
      setSubmitOTPLoading(false);
    }
  };

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [paymentMethod]);

  return (
    <>
      <Modal visible={cameraActive} animationType="slide">
        {permission?.granted ? (
          <CameraView ref={cameraRef} style={{ flex: 1 }} facing={facing}>
            <View className="flex-1 justify-end items-center p-4">
              <View className="flex-row justify-center mb-10">
                <TouchableOpacity
                  onPress={() =>
                    setFacing(facing === "back" ? "front" : "back")
                  }
                  className="bg-gray-800 rounded-full p-3 mx-4"
                >
                  <Ionicons name="camera-reverse" size={24} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={takePicture}
                  className="bg-white rounded-full p-3 mx-4"
                >
                  <Ionicons name="camera" size={24} color="black" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setCameraActive(false)}
                  className="bg-gray-800 rounded-full p-3 mx-4"
                >
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </CameraView>
        ) : (
          <View className="flex-1 justify-center items-center bg-black">
            <Text className="text-white text-lg mb-4">
              Camera permission not granted
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              className="bg-indigo-600 px-4 py-2 rounded-lg"
            >
              <Text className="text-white">Request Permission</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>

      <Modal
        visible={otpScreen}
        animationType="fade"
        statusBarTranslucent={true}
        transparent={true}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
        >
          <View className="flex-1 bg-black/40 justify-center items-center">
            <View className="flex rounded-3xl w-3/4 bg-white py-6">
              {/* title */}
              <View className="w-full pb-4 mb-6 flex justify-center items-center px-4">
                <Text className="text-2xl font-GeistRegular">
                  Enter OTP Sent
                </Text>
                <TouchableOpacity
                  className="absolute top-0.5 right-3"
                  onPress={handleCancelOtp}
                >
                  <Entypo name="circle-with-cross" size={24} color="black" />
                </TouchableOpacity>
              </View>

              {/* inputs */}
              <View className="flex flex-row gap-1 justify-center px-4">
                {otp.map((item, index) => (
                  <TextInput
                    ref={references.current[index]}
                    key={index}
                    value={otp[index]} // <-- add this
                    textAlign="center"
                    textAlignVertical="center"
                    onChangeText={(text: string) => {
                      const char = text.slice(-1);
                      const copy = [...otp];
                      copy[index] = char;
                      setOtp(copy);
                      if (
                        char &&
                        index < 5 &&
                        references.current[index + 1]?.current
                      ) {
                        references.current[index + 1].current.focus();
                      }
                    }}
                    onKeyPress={(e: any) => {
                      if (index > 0 && e.nativeEvent.key === "Backspace") {
                        references.current[index - 1].current.focus();
                      }
                    }}
                    inputMode="numeric"
                    maxLength={1}
                    style={{ height: 48, width: 40 }}
                    className="border border-gray-400 text-xl text-gray-900 rounded-lg"
                  />
                ))}
              </View>

              {/* submit */}
              <View className="mt-6 justify-center items-center">
                <TouchableOpacity
                  onPress={handleSubmit}
                  disabled={submitOTPLoading}
                  className="flex rounded-3xl justify-center items-center w-1/2 h-14 bg-blue-600"
                >
                  <Text className="text-white font-GeistSemiBold">
                    {submitOTPLoading ? "Saving..." : "Submit OTP"}
                  </Text>
                </TouchableOpacity>
                <Text className="mt-3">Time: {formattedTime}</Text>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <SafeAreaView className="flex-1 bg-white">
        {/* Header */}
        <View className="bg-indigo-600 px-5 py-4 flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-xl font-GeistBold">
              New Collection
            </Text>
            <Text className="text-white/80 text-sm">{partyName}</Text>
          </View>
        </View>

        <ScrollView className="flex-1">
          <Animated.View style={{ opacity: fadeAnim }} className="p-5">
            {/* Payment Method Selection */}
            {!paymentMethod && (
              <View>
                <Text className="text-xl font-GeistBold text-gray-800 mb-5">
                  Select Payment Method
                </Text>

                <View className="flex-row flex-wrap justify-between">
                  <TouchableOpacity
                    className="w-[48%] bg-white rounded-xl shadow-sm mb-4 overflow-hidden border border-gray-100"
                    onPress={() => setPaymentMethod("cash")}
                  >
                    <View className="bg-green-50 p-3 items-center justify-center">
                      <View className="w-12 h-12 bg-green-100 rounded-full items-center justify-center">
                        <Text className="text-2xl">💵</Text>
                      </View>
                    </View>
                    <View className="p-3 items-center">
                      <Text className="text-base font-GeistBold text-gray-800">
                        Cash
                      </Text>
                      <Text className="text-xs text-gray-500 text-center">
                        Quick cash payment
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="w-[48%] bg-white rounded-xl shadow-sm mb-4 overflow-hidden border border-gray-100"
                    onPress={() => setPaymentMethod("cheque")}
                  >
                    <View className="bg-blue-50 p-3 items-center justify-center">
                      <View className="w-12 h-12 bg-blue-100 rounded-full items-center justify-center">
                        <Text className="text-2xl">🏦</Text>
                      </View>
                    </View>
                    <View className="p-3 items-center">
                      <Text className="text-base font-GeistBold text-gray-800">
                        Cheque
                      </Text>
                      <Text className="text-xs text-gray-500 text-center">
                        Bank cheque payment
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className="w-[48%] bg-white rounded-xl shadow-sm mb-4 overflow-hidden border border-gray-100"
                    onPress={() => setPaymentMethod("online")}
                  >
                    <View className="bg-purple-50 p-3 items-center justify-center">
                      <View className="w-12 h-12 bg-purple-100 rounded-full items-center justify-center">
                        <Text className="text-2xl">📱</Text>
                      </View>
                    </View>
                    <View className="p-3 items-center">
                      <Text className="text-base font-GeistBold text-gray-800">
                        Online
                      </Text>
                      <Text className="text-xs text-gray-500 text-center">
                        UPI or bank transfer
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Payment Forms */}
            {paymentMethod && (
              <View>
                <View className="flex-row justify-between items-center mb-5">
                  <Text className="text-xl font-GeistBold text-gray-800">
                    {paymentMethod.charAt(0).toUpperCase() +
                      paymentMethod.slice(1)}{" "}
                    Payment
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPaymentMethod(null)}
                    className="bg-gray-100 px-3 py-1.5 rounded-full"
                  >
                    <Text className="text-gray-600 text-sm">Change</Text>
                  </TouchableOpacity>
                </View>

                {/* Amount Field */}
                <View className="mb-5">
                  <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                    Amount
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-lg px-4 py-3 border border-gray-200">
                    <Text className="text-xl text-gray-400 mr-2">₹</Text>
                    <TextInput
                      className="flex-1 text-xl text-gray-800"
                      keyboardType="numeric"
                      placeholder="0.00"
                      value={amount}
                      onChangeText={setAmount}
                      placeholderTextColor="#94A3B8"
                    />
                  </View>
                </View>

                {/* Cheque Fields */}
                {paymentMethod === "cheque" && (
                  <>
                    <View className="mb-5">
                      <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                        Cheque Number
                      </Text>
                      <TextInput
                        className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800 border border-gray-200"
                        placeholder="Enter cheque number"
                        value={chequeNumber}
                        onChangeText={setChequeNumber}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View className="mb-5">
                      <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                        Cheque Date
                      </Text>
                      <TextInput
                        className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800 border border-gray-200"
                        placeholder="DD/MM/YYYY"
                        value={chequeDate}
                        onChangeText={setChequeDate}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View className="mb-5">
                      <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                        Bank Name
                      </Text>
                      <TextInput
                        className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800 border border-gray-200"
                        placeholder="Enter bank name"
                        value={bankName}
                        onChangeText={setBankName}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                    <View className="mb-5">
                      <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                        Cheque Photo
                      </Text>
                      <TouchableOpacity
                        onPress={() => takePhoto("cheque")}
                        className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                      >
                        {chequeImage ? (
                          <Image
                            source={{ uri: chequeImage }}
                            className="w-full h-48 bg-gray-100"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="p-4 items-center">
                            <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mb-2">
                              <Ionicons
                                name="camera-outline"
                                size={24}
                                color="#64748b"
                              />
                            </View>
                            <Text className="text-gray-600 text-center">
                              Take Cheque Photo
                            </Text>
                            <Text className="text-xs text-gray-500 text-center mt-1">
                              Tap to capture now
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Online Payment Fields */}
                {paymentMethod === "online" && (
                  <>
                    <View className="mb-5">
                      <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                        Transaction ID
                      </Text>
                      <TextInput
                        className="bg-gray-50 rounded-lg px-4 py-3 text-gray-800 border border-gray-200"
                        placeholder="Enter transaction ID"
                        value={transactionId}
                        onChangeText={setTransactionId}
                        placeholderTextColor="#94A3B8"
                      />
                    </View>

                    <View className="mb-5">
                      <Text className="text-sm font-GeistMedium text-gray-500 mb-2">
                        Payment Screenshot
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          Alert.alert("Pick method to pick images", "", [
                            {
                              text: "Camera",
                              onPress: () => takePhoto("online"),
                            },
                            { text: "Library", onPress: () => pickImage() },
                          ]);
                        }}
                        className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden"
                      >
                        {onlinePaymentImage ? (
                          <Image
                            source={{ uri: onlinePaymentImage }}
                            className="w-full h-48 bg-gray-100"
                            resizeMode="cover"
                          />
                        ) : (
                          <View className="p-4 items-center">
                            <View className="w-12 h-12 bg-gray-100 rounded-full items-center justify-center mb-2">
                              <Ionicons
                                name="camera-outline"
                                size={24}
                                color="#64748b"
                              />
                            </View>
                            <Text className="text-gray-600 text-center">
                              Take Payment Screenshot
                            </Text>
                            <Text className="text-xs text-gray-500 text-center mt-1">
                              Tap to capture now
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Submit Button */}
                <TouchableOpacity
                  className={`bg-indigo-600 rounded-lg py-4 mt-5 ${
                    confirmLoading ? "opacity-70" : ""
                  }`}
                  onPress={handleConfirm}
                  disabled={confirmLoading && isNumberNotAvailable}
                >
                  <Text className="text-white text-center font-GeistBold">
                    {confirmLoading ? "Saving..." : "Confirm Collection"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
};

export default Collection;
