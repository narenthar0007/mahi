import { TextInput } from 'react-native';
import { inputStyle, useUI } from '../../utils/uiTheme';

export default function AppInput({ style, placeholderTextColor, ...props }) {
  const ui = useUI();
  return (
    <TextInput
      placeholderTextColor={placeholderTextColor || ui.textMuted}
      style={[inputStyle(ui), style]}
      {...props}
    />
  );
}
