import { useState } from 'react';
import { ChevronDown, ChevronRight, Folder, FileText } from 'lucide-react';
import { TreeCheckbox } from './TreeCheckbox';

export interface TreeNode {
    name: string;
    path: string;
    isDirectory: boolean;
    children: Record<string, TreeNode>;
}

export function TreeNodeView({
    node,
    depth,
    selectedPaths,
    onToggle
}: {
    node: TreeNode;
    depth: number;
    selectedPaths: Set<string>;
    onToggle: (path: string, isDir: boolean) => void;
}) {
    const [expanded, setExpanded] = useState(depth < 2);

    // Sort directories first, then alphabetical
    const children = Object.values(node.children).sort((a, b) => {
        if (a.isDirectory === b.isDirectory) return a.name.localeCompare(b.name);
        return a.isDirectory ? -1 : 1;
    });

    if (children.length === 0 && node.isDirectory) return null;

    const isChecked = selectedPaths.has(node.path);

    // Check if the directory is partially selected (has some files selected, but not all)
    let isPartial = false;
    let isAll = false;

    if (node.isDirectory) {
        // Collect all descendant files
        const getDescendants = (n: TreeNode): string[] => {
            let list: string[] = [];
            if (!n.isDirectory) list.push(n.path);
            else Object.values(n.children).forEach(c => list = list.concat(getDescendants(c)));
            return list;
        };
        const descendants = getDescendants(node);
        const selectedCount = descendants.filter(f => selectedPaths.has(f)).length;

        if (selectedCount > 0 && selectedCount < descendants.length) {
            isPartial = true;
        } else if (selectedCount > 0 && selectedCount === descendants.length) {
            isAll = true;
        }
    }

    return (
        <div className="flex flex-col">
            <div
                className="flex items-center gap-1.5 py-1.5 px-1 hover:bg-gray-100 cursor-pointer rounded-md transition-colors"
                style={{ paddingLeft: `${depth * 16}px` }}
                onClick={() => node.isDirectory ? setExpanded(!expanded) : onToggle(node.path, false)}
            >
                {/* Expand Icon */}
                <div
                    className="w-4 flex justify-center cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        if (node.isDirectory) setExpanded(!expanded);
                    }}
                >
                    {node.isDirectory && (
                        expanded
                            ? <ChevronDown size={14} className="text-gray-500" />
                            : <ChevronRight size={14} className="text-gray-400" />
                    )}
                </div>

                {/* Checkbox */}
                <TreeCheckbox
                    checked={node.isDirectory ? isAll : isChecked}
                    partial={node.isDirectory ? isPartial : undefined}
                    onClick={() => onToggle(node.path, node.isDirectory)}
                />

                {/* File/Folder Icon */}
                {node.isDirectory ? (
                    <Folder size={14} className="text-blue-500 fill-blue-50" />
                ) : (
                    <FileText size={14} className="text-blue-500" />
                )}

                <span className="text-sm text-gray-700 select-none truncate">{node.name}</span>
            </div>

            {expanded && node.isDirectory && (
                <div className="flex flex-col border-l border-gray-100 ml-[6px] mt-0.5">
                    {children.map(child => (
                        <TreeNodeView
                            key={child.path}
                            node={child}
                            depth={depth + 1}
                            selectedPaths={selectedPaths}
                            onToggle={onToggle}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
