import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, typography } from '../theme/tokens';

const EMOJI_CATEGORIES = [
  {
    id: 'smileys',
    name: 'Smileys',
    icon: 'sentiment-satisfied-alt',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '🥲', '😊',
      '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙',
      '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎',
      '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁',
      '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😮‍💨', '😤', '😠',
      '😡', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓',
      '🤗', '🤔', '🫣', '🤭', '🫢', '🫡', '🤫', '🫠', '🤐', '😴',
    ],
  },
  {
    id: 'gestures',
    name: 'People',
    icon: 'pan-tool',
    emojis: [
      '👍', '👎', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘',
      '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👋', '🤚',
      '🖐️', '✋', '🖖', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️',
      '💪', '🦾', '🧠', '🫀', '🫁', '👀', '👁️', '🗣️', '👤', '👥',
      '🧑‍💼', '👨‍💼', '👩‍💼', '🧑‍🌾', '👨‍🌾', '👩‍🌾', '🧑‍🔧', '👨‍💻', '👮', '👷',
    ],
  },
  {
    id: 'objects',
    name: 'Work',
    icon: 'work',
    emojis: [
      '💼', '📁', '📂', '📅', '📆', '📋', '📌', '📍', '📎', '✂️',
      '🔒', '🔓', '🔑', '🔍', '🔎', '💡', '🔦', '📞', '📱', '📲',
      '💻', '🖥️', '⌨️', '✉️', '📧', '📦', '🏷️', '💰', '💵', '💳',
      '🚗', '🚕', '🚙', '🚚', '🚛', '🛵', '🏍️', '🚲', '⏰', '⏱️',
      '🔔', '🔕', '📢', '📣', '🎯', '🏆', '🥇', '🥈', '🥉', '📦',
    ],
  },
  {
    id: 'symbols',
    name: 'Symbols',
    icon: 'favorite',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❤️‍🔥', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '✨', '⭐',
      '🌟', '💫', '💥', '🔥', '💯', '💢', '💬', '💭', '🗯️', '✔️',
      '✅', '☑️', '❌', '❎', '➕', '➖', '➗', '❓', '❗', '❕',
      '⚠️', '⛔', '🚫', '🟢', '🔴', '🟡', '🔵', '🟠', '🟣', '🏁',
    ],
  },
];

export const EmojiPicker = ({ onSelectEmoji, onClose }) => {
  const [activeCategoryId, setActiveCategoryId] = useState('smileys');

  const currentCategory = useMemo(() => {
    return EMOJI_CATEGORIES.find((c) => c.id === activeCategoryId) || EMOJI_CATEGORIES[0];
  }, [activeCategoryId]);

  const renderEmojiItem = ({ item }) => (
    <TouchableOpacity
      style={styles.emojiCell}
      onPress={() => onSelectEmoji(item)}
      activeOpacity={0.6}
    >
      <Text style={styles.emojiText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Top category tabs + close button */}
      <View style={styles.tabBar}>
        <View style={styles.tabsRow}>
          {EMOJI_CATEGORIES.map((cat) => {
            const isActive = cat.id === activeCategoryId;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                onPress={() => setActiveCategoryId(cat.id)}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={cat.icon}
                  size={20}
                  color={isActive ? colors.primary : colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    isActive && styles.tabLabelActive,
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.7}>
          <MaterialIcons name="keyboard-hide" size={22} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>

      {/* Grid of emojis for active category */}
      <FlatList
        data={currentCategory.emojis}
        keyExtractor={(item, index) => `${activeCategoryId}_${index}`}
        renderItem={renderEmojiItem}
        numColumns={8}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="always"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 240,
    backgroundColor: colors.surfaceContainerLowest,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  tabsRow: {
    flexDirection: 'row',
    flex: 1,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 4,
  },
  tabButtonActive: {
    backgroundColor: colors.primaryContainer,
  },
  tabLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
  },
  tabLabelActive: {
    color: colors.onPrimaryContainer,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
  },
  gridContent: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  emojiCell: {
    flex: 1 / 8,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 24,
  },
});
