import 'react-native-gesture-handler';
import 'react-native-reanimated';
import { registerRootComponent } from 'expo';
import App from './App';
import { installWebAlert } from './src/utils/webAlert';

installWebAlert();
registerRootComponent(App);
