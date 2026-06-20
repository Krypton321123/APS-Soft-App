// hooks/useForceUpdate.ts
import { useEffect, useState } from "react";
import { Linking } from "react-native";
import * as Application from "expo-application";
import ky from "ky";
import { API_URL } from "../constants";

export const useForceUpdate = () => {
  const [updateRequired, setUpdateRequired] = useState(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // This is the versionCode EAS auto-increments on every build
        const currentVersionCode = Application.nativeBuildVersion; 

        const response: any = await ky
          .get(`${API_URL}/app/config`)
          .json();

        const minVersion = response.data.minAndroidVersion;

        if (Number(currentVersionCode) < minVersion) {
          setUpdateRequired(true);
        }
      } catch (err) {
      
        console.log("Version check failed:", err);
      }
    };

    checkVersion();
  }, []);

  const goToStore = () => {
    Linking.openURL(
      "https://play.google.com/store/apps/details?id=com.krypton321123.aps"
    );
  };

  return { updateRequired, goToStore };
};