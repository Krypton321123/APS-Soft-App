import { View, TextInput, Text, Keyboard } from 'react-native';
import React, { ReactElement, useState } from 'react';

const InputComponent = ({
  onChangeText,
  label,
  Icon,
  isPassword,
}: {
  onChangeText: (value: string) => void;
  label: string;
  Icon: ReactElement;
  isPassword: boolean;
}) => {
  const [isActive, setIsActive] = useState(false);

  return (
    <View
      className={`bg-gray-200 border-[1px] rounded-xl h-[85] w-[300] ${
        isActive ? 'border-violet-500' : 'border-gray-400'
      }`}
    >
      <Text className="ml-4 mt-3 text-base font-GeistRegular">{label}</Text>
      <View className="mt-[10] h-8 flex-row items-center justify-around">
        <TextInput
          secureTextEntry={isPassword}
          keyboardAppearance="dark"
          onFocus={() => setIsActive(true)}
          onBlur={() => setIsActive(false)}
          onChangeText={onChangeText}
          className="h-[40] w-[200] text-lg text-black font-GeistSemiBold"
        />
        <Text>{Icon}</Text>
      </View>
    </View>
  );
};

export default InputComponent;