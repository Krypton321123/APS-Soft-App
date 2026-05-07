import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager"; 
import * as BackgroundTask from "expo-background-task"
import * as ExpoNotifications from "expo-notifications"
export const BACKGROUND_CHECK_LOGIN_TASK = "LOGIN_BACKGROUND_TASK"; 


TaskManager.defineTask(BACKGROUND_CHECK_LOGIN_TASK, async () => {
    const now = new Date(); 

    console.log(now.getHours()); 

    if (now.getHours() > 11) {
        return BackgroundTask.BackgroundTaskResult.Failed; 
    }
    const login = await AsyncStorage.getItem("userId");

    console.log(login);
    
    if (!login) return BackgroundTask.BackgroundTaskResult.Failed; 

    

    await ExpoNotifications.scheduleNotificationAsync({
        content: {
            title: "Please logout, the time is over 6PM", 
            body: "Please logout, You're still logged in", 
        }, 
        trigger: null, 
    })

    return BackgroundTask.BackgroundTaskResult.Success; 
}); 