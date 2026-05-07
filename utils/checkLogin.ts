import * as BackgroundTask from "expo-background-task"; 
import { BACKGROUND_CHECK_LOGIN_TASK } from "@/tasks/checkLoginTask";
import * as Notifications from "expo-notifications"; 
import TaskManager from "expo-task-manager"

export const startLoginChecking = async () => {
    console.log("started login checking"); 
    await BackgroundTask.registerTaskAsync(BACKGROUND_CHECK_LOGIN_TASK); 
}

const stopChecking = async () => {
    const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_CHECK_LOGIN_TASK);  

    if (isRegistered) {
        await BackgroundTask.unregisterTaskAsync(BACKGROUND_CHECK_LOGIN_TASK); 
    }
}