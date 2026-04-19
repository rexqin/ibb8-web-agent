/**
 * 复合控件（如 range、select、details）在序列化时附加的虚拟子部件描述
 *（与 DOMTreeSerializer 中 push 到 _compoundChildren 的结构一致）
 */
export interface CompoundChildInfo {
  role: string;
  name: string;
  valuemin: number | null;
  valuemax: number | null;
  valuenow: string | number | null;
  optionsCount?: number;
  firstOptions?: string[];
  formatHint?: string;
}
