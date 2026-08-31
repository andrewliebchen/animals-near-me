import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import BottomSheet, { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Observation } from "../types/observation";
import { ObservationListRow } from "./ObservationListRow";
import { useTheme } from "../utils/theme";

// Handle (~24) + header (~28) + 1.5 rows (80 each)
export const LIST_SHEET_PEEK_HEIGHT = 24 + 28 + Math.round(80 * 1.5);

interface ObservationListSheetProps {
  observations: Observation[];
  seenObservationIds: Set<string>;
  selectedId?: string | null;
  isLoading?: boolean;
  peekHeight?: number;
  visible?: boolean;
  restoreIndex?: number;
  onSelect: (observation: Observation) => void;
  onSnapIndexChange?: (index: number) => void;
}

export const ObservationListSheet: React.FC<ObservationListSheetProps> = ({
  observations,
  seenObservationIds,
  selectedId,
  isLoading = false,
  peekHeight = LIST_SHEET_PEEK_HEIGHT,
  visible = true,
  restoreIndex = 0,
  onSelect,
  onSnapIndexChange,
}) => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const snapPoints = useMemo(() => [peekHeight, "50%", "92%"], [peekHeight]);
  const sheetRef = React.useRef<BottomSheet>(null);
  const restoreIndexRef = React.useRef(restoreIndex);
  restoreIndexRef.current = restoreIndex;

  React.useEffect(() => {
    if (!sheetRef.current) {
      return;
    }
    if (visible) {
      const index = Math.min(
        Math.max(restoreIndexRef.current, 0),
        snapPoints.length - 1
      );
      sheetRef.current.snapToIndex(index);
    } else {
      sheetRef.current.close();
    }
  }, [visible, snapPoints.length]);

  const isDark = theme.background.primary === "#000000";
  const shadowColor = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.12)";

  const shadowStyle = {
    backgroundColor: theme.background.card,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    shadowColor,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 16,
  };

  const countLabel =
    observations.length === 1
      ? "1 animal nearby"
      : `${observations.length} animals nearby`;

  const renderItem = ({ item }: { item: Observation }) => (
    <ObservationListRow
      observation={item}
      seen={seenObservationIds.has(item.id)}
      selected={selectedId === item.id}
      onPress={onSelect}
    />
  );

  const listHeader = (
    <View style={styles.header}>
      <Text style={[styles.count, { color: theme.text.primary }]} allowFontScaling={true}>
        {countLabel}
      </Text>
    </View>
  );

  const listEmpty = (
    <View style={styles.empty}>
      <Text style={[styles.emptyText, { color: theme.text.secondary }]} allowFontScaling={true}>
        {isLoading ? "Searching nearby…" : "No sightings in this area"}
      </Text>
    </View>
  );

  return (
    <BottomSheet
      ref={sheetRef}
      key={`peek-${peekHeight}`}
      index={visible ? Math.max(0, restoreIndex) : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      enableOverDrag={false}
      onChange={(index) => onSnapIndexChange?.(index)}
      handleIndicatorStyle={{ backgroundColor: theme.border, width: 80 }}
      backgroundStyle={shadowStyle}
      containerStyle={styles.sheetContainer}
    >
      <BottomSheetFlatList
        data={observations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        extraData={`${selectedId}-${seenObservationIds.size}-${isLoading}`}
        contentContainerStyle={[styles.listContent, { paddingBottom: 32 + insets.bottom }]}
      />
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  count: {
    fontSize: 16,
    fontWeight: "700",
  },
  listContent: {
    paddingBottom: 32,
  },
  empty: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyText: {
    fontSize: 14,
  },
});
