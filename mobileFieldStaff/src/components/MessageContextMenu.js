import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Animated,
  Modal,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography, elevation } from '../theme/tokens';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function MessageContextMenu({
  visible,
  message,
  layout,
  onClose,
  isMe,
  onAction,
  renderClone,
}) {
  const insets = useSafeAreaInsets();
  const [mounted, setMounted] = useState(visible);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  if (visible && !mounted) {
    setMounted(true);
  }

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 7,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (mounted) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => setMounted(false));
    }
  }, [visible]);

  if (!mounted && !visible) return null;

  // Calculate layout bounds
  const ACTION_MENU_HEIGHT = 280; // Approximate max height of the menu
  const REACTION_BAR_HEIGHT = 56;
  const MARGIN = 8;
  
  let { x, y, width, height } = layout || { x: 0, y: 0, width: 0, height: 0 };
  
  // Constrain coordinates so they don't break if layout was measured incorrectly
  if (y < insets.top) y = insets.top;
  
  // Decide position of reaction bar and action menu based on available screen space
  let reactionBarTop = y - REACTION_BAR_HEIGHT - MARGIN;
  let actionMenuTop = y + height + MARGIN;
  
  const isTooHigh = reactionBarTop < insets.top;
  const isTooLow = actionMenuTop + ACTION_MENU_HEIGHT > SCREEN_HEIGHT - insets.bottom;

  // If there's no room above, push reactions below the action menu
  if (isTooHigh) {
    reactionBarTop = actionMenuTop;
    actionMenuTop = actionMenuTop + REACTION_BAR_HEIGHT + MARGIN;
  }
  
  // If there's no room below, push action menu above the message (and push reactions even higher)
  if (isTooLow) {
    actionMenuTop = y - ACTION_MENU_HEIGHT - MARGIN;
    reactionBarTop = actionMenuTop - REACTION_BAR_HEIGHT - MARGIN;
    
    // If it STILL doesn't fit (message is huge), just dock it to safe bounds
    if (actionMenuTop < insets.top) {
      actionMenuTop = insets.top + MARGIN;
    }
  }

  // Anchor the reaction bar and menu to the left/right depending on who sent the message
  const horizontalAnchor = isMe
    ? { right: SCREEN_WIDTH - (x + width) }
    : { left: x };

  const handleAction = (action) => {
    onClose();
    setTimeout(() => onAction(action, message), 200);
  };

  const handleReaction = (emoji) => {
    onClose();
    setTimeout(() => onAction('react', message, emoji), 200);
  };

  const ActionItem = ({ icon, label, action, destructive }) => (
    <TouchableOpacity
      style={styles.actionItem}
      onPress={() => handleAction(action)}
      activeOpacity={0.7}
    >
      <MaterialIcons
        name={icon}
        size={22}
        color={destructive ? colors.error : colors.onSurface}
      />
      <Text style={[styles.actionText, destructive && { color: colors.error }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
        ]}
        pointerEvents="box-none"
      >
        {/* Render the cloned message exactly where it was */}
        {layout && width > 0 && (
          <View style={[styles.cloneWrapper, { top: y, left: x, width, height }]}>
            {renderClone && renderClone(message)}
          </View>
        )}

        {/* Reaction Bar */}
        <View style={[styles.reactionBar, horizontalAnchor, { top: reactionBarTop }]}>
          {REACTIONS.map((emoji, index) => (
            <TouchableOpacity
              key={index}
              style={styles.reactionBtn}
              onPress={() => handleReaction(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.reactionBtn}
            onPress={() => handleAction('more_reactions')}
          >
            <MaterialIcons name="add" size={20} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        </View>

        {/* Action Menu */}
        <View style={[styles.actionMenu, horizontalAnchor, { top: actionMenuTop, maxHeight: ACTION_MENU_HEIGHT }]}>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            <ActionItem icon="reply" label="Reply" action="reply" />
            <ActionItem icon="content-copy" label="Copy" action="copy" />
            <ActionItem icon="forward" label="Forward" action="forward" />
            {isMe && <ActionItem icon="edit" label="Edit" action="edit" />}
            <ActionItem icon="star-border" label="Star" action="star" />
            <ActionItem icon="push-pin" label="Pin" action="pin" />
            <ActionItem icon="note-add" label="Add to Note" action="note" />
            <ActionItem icon="info-outline" label="Info" action="info" />
            <ActionItem icon="translate" label="Translate" action="translate" />
            {isMe && (
              <ActionItem
                icon="delete-outline"
                label="Delete"
                action="delete"
                destructive
              />
            )}
          </ScrollView>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  cloneWrapper: {
    position: 'absolute',
  },
  reactionBar: {
    position: 'absolute',
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 6,
    ...elevation.level3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  reactionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 2,
    backgroundColor: colors.surfaceContainerLow,
  },
  reactionEmoji: {
    fontSize: 22,
  },
  actionMenu: {
    position: 'absolute',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 16,
    width: 220,
    ...elevation.level3,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  actionText: {
    ...typography.bodyLg,
    color: colors.onSurface,
    marginLeft: 16,
  },
});
