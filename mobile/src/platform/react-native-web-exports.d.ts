// react-native-web's own files, imported directly by RefreshControl.web.tsx
// (importing 'react-native' there would loop back to it). Same components as react-native's.
declare module 'react-native-web/dist/exports/View' {
  import { View } from 'react-native';
  export default View;
}
declare module 'react-native-web/dist/exports/ActivityIndicator' {
  import { ActivityIndicator } from 'react-native';
  export default ActivityIndicator;
}
