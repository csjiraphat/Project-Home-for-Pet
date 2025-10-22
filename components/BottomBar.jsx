import React, { useState } from "react";
import { View, TouchableOpacity, StyleSheet, Text, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useUser } from "../context/UserContext";
import { useChatList } from "../context/ChatListProvider";

const BottomBar = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useUser();
  const userType = user?.userType;
  const currentRoute = route.name;
  const { hasNewMessage, setHasNewMessage } = useChatList();

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  const handleHomePress = () => {
    if (currentRoute !== "Home") navigation.navigate("Home");
    else console.log("รีเฟรชหน้า Home");
  };

  const handleAddPostPress = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (userType === "fhome") {
      if (currentRoute !== "PetPost") navigation.navigate("PetPost");
      else console.log("รีเฟรชหน้า PetPost");
    } else if (userType === "fpet") {
      if (currentRoute !== "HomePost") navigation.navigate("HomePost");
      else console.log("รีเฟรชหน้า HomePost");
    } else {
      console.warn("ไม่พบ userType ที่รองรับ");
    }
  };

  const handleChatPress = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }
    setHasNewMessage(false);
    if (currentRoute !== "ChatListScreen")
      navigation.navigate("ChatListScreen");
    else console.log("รีเฟรชหน้า Chat");
  };

  const handleProfilePress = () => {
    if (!user) {
      setShowLoginPrompt(true);
      return;
    }

    if (currentRoute !== "Profile") navigation.navigate("Profile");
    else console.log("รีเฟรชหน้า Profile");
  };

  const getIconColor = (routeName) =>
    currentRoute === routeName ? "#007bff" : "black";

  return (
    <>
      <View style={styles.container}>
        <TouchableOpacity style={styles.button} onPress={handleHomePress}>
          <Ionicons
            name="home-outline"
            size={24}
            color={getIconColor("Home")}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleAddPostPress}>
          <Ionicons
            name="add-circle-outline"
            size={24}
            color={getIconColor(userType === "fhome" ? "PetPost" : "HomePost")}
          />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleChatPress}>
          <Ionicons
            name="chatbubble-outline"
            size={24}
            color={getIconColor("ChatListScreen")}
          />
          {hasNewMessage && <View style={styles.notificationDot} />}
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleProfilePress}>
          <Ionicons
            name="person-outline"
            size={24}
            color={getIconColor("Profile")}
          />
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLoginPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLoginPrompt(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowLoginPrompt(false)}
            >
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>กรุณาล็อคอินเข้าใช้งาน</Text>
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => {
                setShowLoginPrompt(false);
                navigation.navigate("Login");
              }}
            >
              <Text style={styles.loginButtonText}>ไปยังหน้าล็อคอิน</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    paddingVertical: 10,
  },
  button: {
    flex: 1,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 10,
    elevation: 5,
    alignItems: "center",
    position: "relative",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginVertical: 20,
    textAlign: "center",
  },
  loginButton: {
    backgroundColor: "#007bff",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  notificationDot: {
    position: "absolute",
    top: 2,
    right: 20,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "red",
  },
});

export default BottomBar;
