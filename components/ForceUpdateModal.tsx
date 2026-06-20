import { Modal, View, Text, TouchableOpacity, BackHandler } from "react-native";
import { useEffect } from "react";

interface Props {
  visible: boolean;
  onUpdate: () => void;
}

const ForceUpdateModal = ({ visible, onUpdate }: Props) => {
  useEffect(() => {
    if (!visible) return;

    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true
    );

    return () => subscription.remove();
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View className="flex-1 bg-black/70 justify-center items-center px-8">
        <View className="bg-white w-full rounded-2xl px-6 py-8 items-center gap-4 elevation-10">
          
          {/* Icon circle */}
          <View className="bg-blue-100 rounded-full p-4 mb-2">
            <Text className="text-4xl">🔄</Text>
          </View>

          {/* Title */}
          <Text className="text-2xl font-bold text-blue-900 tracking-tight">
            Update Required
          </Text>

          {/* Divider */}
          <View className="w-12 h-1 bg-blue-600 rounded-full" />

          {/* Message */}
          <Text className="text-base text-gray-500 text-center leading-6">
            A new version of the app is available with important updates and
            improvements. Please update to continue.
          </Text>

          {/* Version badge */}
          <View className="bg-blue-50 border border-blue-200 rounded-full px-4 py-1">
            <Text className="text-blue-600 text-sm font-semibold">
              New version available
            </Text>
          </View>

          {/* Update button */}
          <TouchableOpacity
            onPress={onUpdate}
            className="bg-blue-600 w-full py-4 rounded-xl items-center mt-2 active:bg-blue-700"
          >
            <Text className="text-white font-bold text-lg tracking-wide">
              Update Now
            </Text>
          </TouchableOpacity>

          {/* Footer note */}
          <Text className="text-xs text-gray-400 text-center">
            You must update to continue using the app
          </Text>
        </View>
      </View>
    </Modal>
  );
};

export default ForceUpdateModal;