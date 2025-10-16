import React from 'react';
import { View, Text } from 'react-native';

export default function App() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#000' }}>
        ✅ APP WORKS!
      </Text>
      <Text style={{ fontSize: 16, color: '#666', marginTop: 10 }}>
        React Native Web is rendering correctly
      </Text>
    </View>
  );
}
