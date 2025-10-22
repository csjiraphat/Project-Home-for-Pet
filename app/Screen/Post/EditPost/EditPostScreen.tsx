import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useRoute } from '@react-navigation/native';
import EditHomeForm from './Edit_Home';
import EditPetForm from './Edit_Pet';

const EditPostScreen: React.FC = () => {
  const route = useRoute();
  const { post } = route.params as { post: any };

  if (!post || !post.postType) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>ไม่พบข้อมูลโพสต์</Text>
      </View>
    );
  }

  return post.postType === 'fh' ? (
    <EditHomeForm />
  ) : (
    <EditPetForm />
  );
};

export default EditPostScreen;
