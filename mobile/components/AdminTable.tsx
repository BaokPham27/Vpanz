import { sharedStyles } from '@/styles/sharedStyles';
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface AdminTableProps {
  data: any[];
  columns: string[];
  labels: Record<string, string>;
  renderItem?: (item: any) => React.ReactNode;
  renderBadge?: (item: any) => React.ReactNode;
  onEdit?: (item: any) => void;
  onDelete?: (id: string) => void;
}

export default function AdminTable({
  data,
  columns,
  labels,
  renderItem,
  renderBadge,
  onEdit,
  onDelete,
}: AdminTableProps) {
  if (!data || data.length === 0) {
    return (
      <View style={sharedStyles.table}>
        <View style={sharedStyles.tableHeader}>
          <Text style={sharedStyles.tableTitle}>{labels[columns[0]] || 'Danh sách'}</Text>
        </View>
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Text style={{ color: '#999', fontSize: 16 }}>Chưa có dữ liệu</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={sharedStyles.table}>
      {/* Header */}
      <View style={sharedStyles.tableHeader}>
        <Text style={sharedStyles.tableTitle}>
          {labels[columns[0]] || 'Danh sách'}
        </Text>
        <Text style={sharedStyles.itemCount}>{data.length} mục</Text>
      </View>

      {/* Rows */}
      {data.map((item) => (
        <View key={item._id || item.id} style={sharedStyles.row}>
          {/* Nội dung chính */}
          <View style={sharedStyles.rowContent}>
            {renderItem ? (
              renderItem(item)
            ) : (
              <Text style={sharedStyles.mainText}>
                {(item as any)[columns[0]] || '—'}
              </Text>
            )}

            {/* Các cột phụ */}
            <View style={sharedStyles.rowDetails}>
              {columns.slice(1).map((col) => {
                const value = (item as any)[col];
                const display =
                  col === 'isPublic'
                    ? value
                      ? 'Công khai'
                      : 'Riêng tư'
                    : value != null
                    ? String(value)
                    : '—';

                return (
                  <Text key={col} style={sharedStyles.detailText}>
                    {display}
                  </Text>
                );
              })}
            </View>

            {/* Badge (nếu có) */}
            {renderBadge && (
              <View style={sharedStyles.badgeContainer}>
                {renderBadge(item)}
              </View>
            )}
          </View>

          {/* Nút hành động */}
          {(onEdit || onDelete) && (
            <View style={sharedStyles.actions}>
              {onEdit && (
                <TouchableOpacity
                  onPress={() => onEdit(item)}
                  style={sharedStyles.editBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="edit" size={22} color="#4CAF50" />
                </TouchableOpacity>
              )}
              {onDelete && (
                <TouchableOpacity
                  onPress={() => onDelete((item._id || item.id) as string)}
                  style={sharedStyles.deleteBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <MaterialIcons name="delete" size={22} color="#E91E63" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}