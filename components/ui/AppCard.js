import { View } from 'react-native';
import { cardStyle, useUI } from '../../utils/uiTheme';

export default function AppCard({ children, style, muted = false, ...rest }) {
  const ui = useUI();
  return (
    <View
      style={[
        cardStyle(ui, {
          backgroundColor: muted ? ui.surfaceMuted : ui.surface,
          padding: ui.space.lg,
        }),
        style,
      ]}
      {...rest}
    >
      {children}
    </View>
  );
}
