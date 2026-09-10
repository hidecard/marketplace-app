import 'package:flutter/material.dart';

class FormChecklistItem {
  final String id;
  final String label;
  final bool isCompleted;
  final bool isRequired;
  final String? hint;
  final VoidCallback? onTap;

  const FormChecklistItem({
    required this.id,
    required this.label,
    required this.isCompleted,
    this.isRequired = true,
    this.hint,
    this.onTap,
  });

  FormChecklistItem copyWith({
    bool? isCompleted,
  }) {
    return FormChecklistItem(
      id: id,
      label: label,
      isCompleted: isCompleted ?? this.isCompleted,
      isRequired: isRequired,
      hint: hint,
      onTap: onTap,
    );
  }
}

class FormChecklist extends StatelessWidget {
  final String title;
  final List<FormChecklistItem> items;
  final bool initiallyCollapsed;
  final EdgeInsetsGeometry padding;

  const FormChecklist({
    super.key,
    required this.items,
    this.title = 'Form checklist',
    this.initiallyCollapsed = false,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
  });

  @override
  Widget build(BuildContext context) {
    if (items.isEmpty) return const SizedBox.shrink();

    final completed = items.where((i) => i.isCompleted).length;
    final required = items.where((i) => i.isRequired).length;
    final requiredCompleted =
        items.where((i) => i.isRequired && i.isCompleted).length;
    final allRequiredDone = required == 0 || requiredCompleted == required;
    final percent = required == 0 ? 1.0 : requiredCompleted / required;

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(
          color: allRequiredDone
              ? Colors.green.withValues(alpha: 0.5)
              : Colors.grey.withValues(alpha: 0.3),
        ),
      ),
      child: Theme(
        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
        child: ExpansionTile(
          initiallyExpanded: !initiallyCollapsed,
          tilePadding: const EdgeInsets.symmetric(horizontal: 16),
          childrenPadding: const EdgeInsets.only(bottom: 8),
          leading: Icon(
            allRequiredDone ? Icons.check_circle : Icons.task_alt,
            color: allRequiredDone ? Colors.green : Colors.blueGrey,
          ),
          title: Text(
            title,
            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
          ),
          subtitle: Padding(
            padding: const EdgeInsets.only(top: 6),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(4),
                        child: LinearProgressIndicator(
                          value: percent,
                          minHeight: 6,
                          backgroundColor: Colors.grey.withValues(alpha: 0.2),
                          color: allRequiredDone ? Colors.green : Colors.blue,
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Text(
                      '$requiredCompleted / $required',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ],
                ),
                if (items.length > required)
                  Padding(
                    padding: const EdgeInsets.only(top: 2),
                    child: Text(
                      '$completed of ${items.length} fields done',
                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ),
              ],
            ),
          ),
          children: items.map((item) => _ChecklistRow(item: item)).toList(),
        ),
      ),
    );
  }
}

class _ChecklistRow extends StatelessWidget {
  final FormChecklistItem item;
  const _ChecklistRow({required this.item});

  @override
  Widget build(BuildContext context) {
    final disabledColor = Colors.grey;
    return InkWell(
      onTap: item.onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(
              item.isCompleted
                  ? Icons.check_circle
                  : (item.isRequired ? Icons.radio_button_unchecked : Icons.remove_circle_outline),
              size: 20,
              color: item.isCompleted
                  ? Colors.green
                  : (item.isRequired ? disabledColor : Colors.grey.shade400),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    item.label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: item.isCompleted ? Colors.grey.shade600 : null,
                      decoration:
                          item.isCompleted ? TextDecoration.lineThrough : null,
                    ),
                  ),
                  if (item.hint != null)
                    Padding(
                      padding: const EdgeInsets.only(top: 2),
                      child: Text(
                        item.hint!,
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                    ),
                ],
              ),
            ),
            if (item.isRequired)
              const Padding(
                padding: EdgeInsets.only(left: 4, top: 2),
                child: Text(
                  'required',
                  style: TextStyle(fontSize: 10, color: Colors.redAccent),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
