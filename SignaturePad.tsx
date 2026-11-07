import React, { useRef, useState } from 'react';
import { View, PanResponder, StyleSheet, TouchableOpacity, Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useColors } from '@/hooks/useColors';

interface PathData { d: string; }

interface Props {
  onChange?: (svg: string) => void;
  height?: number;
}

export default function SignaturePad({ onChange, height = 160 }: Props) {
  const colors = useColors();
  const [paths, setPaths] = useState<PathData[]>([]);
  const currentPath = useRef<string>('');

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: ({ nativeEvent: { locationX, locationY } }) => {
      currentPath.current = `M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setPaths(prev => [...prev, { d: currentPath.current }]);
    },
    onPanResponderMove: ({ nativeEvent: { locationX, locationY } }) => {
      currentPath.current += ` L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`;
      setPaths(prev => {
        const next = [...prev];
        next[next.length - 1] = { d: currentPath.current };
        return next;
      });
    },
    onPanResponderRelease: () => {
      const svgStr = paths.map(p => p.d).join(' ');
      onChange?.(svgStr);
    },
  });

  const clear = () => {
    setPaths([]);
    onChange?.('');
  };

  return (
    <View style={[styles.wrapper, { borderColor: colors.border }]}>
      <View
        style={[styles.canvas, { height }]}
        {...panResponder.panHandlers}
      >
        <Svg style={StyleSheet.absoluteFill}>
          {paths.map((p, i) => (
            <Path
              key={i}
              d={p.d}
              stroke={colors.foreground}
              strokeWidth={2}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </Svg>
        {paths.length === 0 && (
          <Text style={[styles.placeholder, { color: colors.mutedForeground }]}>
            وقّع هنا...
          </Text>
        )}
      </View>
      <TouchableOpacity onPress={clear} style={[styles.clearBtn, { borderTopColor: colors.border }]}>
        <Text style={[styles.clearText, { color: colors.mutedForeground }]}>مسح التوقيع</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#fafafa',
  },
  canvas: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    fontSize: 14,
    pointerEvents: 'none' as any,
  },
  clearBtn: {
    paddingVertical: 10,
    alignItems: 'center',
    borderTopWidth: 1,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700' as const,
  },
});
