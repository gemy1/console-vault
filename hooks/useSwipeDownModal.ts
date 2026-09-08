import { useRef, useEffect } from 'react';
import { Animated, PanResponder, Dimensions } from 'react-native';

const getScreenHeight = () => {
  const { height } = Dimensions.get('window');
  return height > 0 ? height : 900;
};

interface UseSwipeDownModalOptions {
  visible: boolean;
  onClose: () => void;
  dismissThreshold?: number;
}

/**
 * Hook to provide butter-smooth swipe-down-to-dismiss for modal sheets.
 * Solves jitter/bounce-back by keeping sheet translated off-screen during unmount.
 */
export function useSwipeDownModal({
  visible,
  onClose,
  dismissThreshold = 90,
}: UseSwipeDownModalOptions) {
  const screenHeight = getScreenHeight();
  const panY = useRef(new Animated.Value(screenHeight)).current;
  const isClosingRef = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosingRef.current = false;
      panY.setValue(screenHeight);
      Animated.spring(panY, {
        toValue: 0,
        damping: 24,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, panY, screenHeight]);

  const closeWithSlide = () => {
    if (isClosingRef.current) return;
    isClosingRef.current = true;

    Animated.timing(panY, {
      toValue: screenHeight,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          panY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > dismissThreshold || gestureState.vy > 0.5) {
          // Slide completely off-screen smoothly, then notify parent to close
          isClosingRef.current = true;
          Animated.timing(panY, {
            toValue: screenHeight,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            onClose();
          });
        } else {
          // Snap back up softly
          Animated.spring(panY, {
            toValue: 0,
            damping: 20,
            stiffness: 280,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return {
    panY,
    panHandlers: panResponder.panHandlers,
    closeWithSlide,
  };
}
