/**
 * 位置计算与格式化：选区换算行范围、查找最近标题、按格式生成位置字符串
 *
 * @author 启年
 * @createTime 2026-10-10 10:39
 */
import { EditorPosition, EditorSelection } from "obsidian";
import { LineRange, LocationContext, LocationFormat, TEMPLATE_VARIABLES } from "./types";

/** Markdown 标题：`## xxx`，去掉结尾可选的 `#` */
const HEADING_REGEX = /^#{1,6}\s+(.*?)(?:\s+#+)?\s*$/;

/** 代码块围栏：``` 或 ~~~ */
const FENCE_REGEX = /^\s*(`{3,}|~{3,})/;

/** 自定义模板变量占位符：`{name}` */
const VARIABLE_REGEX = /\{(\w+)\}/g;

/**
 * 比较两个编辑器位置的先后
 *
 * @param a 位置 A
 * @param b 位置 B
 * @return 负数表示 A 在前，正数表示 B 在前，0 表示相同
 */
function comparePosition(a: EditorPosition, b: EditorPosition): number {
	// 先比行，同行再比列
	return a.line !== b.line ? a.line - b.line : a.ch - b.ch;
}

/**
 * 把编辑器选区换算为行范围，按起始行升序并去除重复范围
 *
 * @param selections 编辑器当前所有选区（无选区时为光标位置）
 * @return 行范围列表（行号从 1 开始）
 */
export function toLineRanges(selections: EditorSelection[]): LineRange[] {
	const ranges: LineRange[] = [];
	for (const selection of selections) {
		// 锚点与光标可能反向，统一取前后位置
		const forward = comparePosition(selection.anchor, selection.head) <= 0;
		const from = forward ? selection.anchor : selection.head;
		const to = forward ? selection.head : selection.anchor;
		let endLine = to.line;
		// 跨行选区末尾落在下一行行首时，末行退回上一行
		if (to.line > from.line && to.ch === 0) {
			endLine--;
		}
		// 编辑器行号从 0 开始，输出时加 1
		ranges.push({ start: from.line + 1, end: endLine + 1 });
	}
	// 按起始行、结束行升序排列
	ranges.sort((a, b) => a.start - b.start || a.end - b.end);
	// 去掉完全相同的范围（如同一行上的多个光标）
	return ranges.filter((range, index) => index === 0 || range.start !== ranges[index - 1].start || range.end !== ranges[index - 1].end);
}

/**
 * 查找指定行（含）之前最近的标题，跳过 frontmatter 与代码块中的 `#` 行
 *
 * @param getLine 按行号（从 0 开始）读取行文本的函数
 * @param lineIndex 选区起始行（从 0 开始）
 * @return 标题文本，没有时返回空字符串
 */
export function findNearestHeading(getLine: (line: number) => string, lineIndex: number): string {
	let heading = "";
	let fence: string | null = null;
	let index = 0;
	// 文件以 --- 开头时跳过 frontmatter
	if (lineIndex > 0 && getLine(0).trim() === "---") {
		index = 1;
		while (index <= lineIndex && getLine(index).trim() !== "---") {
			index++;
		}
		index++;
	}
	for (; index <= lineIndex; index++) {
		const line = getLine(index);
		const fenceMatch = FENCE_REGEX.exec(line);
		if (fenceMatch) {
			const marker = fenceMatch[1];
			// 遇到开始围栏进入代码块，遇到同类且不短于开始围栏的标记时退出
			if (fence === null) {
				fence = marker;
			} else if (marker[0] === fence[0] && marker.length >= fence.length) {
				fence = null;
			}
			continue;
		}
		// 代码块中的 # 行不是标题
		if (fence !== null) {
			continue;
		}
		const headingMatch = HEADING_REGEX.exec(line);
		if (headingMatch) {
			heading = headingMatch[1].trim();
		}
	}
	return heading;
}

/**
 * 生成行范围的展示文本
 *
 * @param range 行范围
 * @return 单行为 `77`，多行为 `77-81`
 */
export function formatRange(range: LineRange): string {
	// 单行不重复写结束行
	return range.start === range.end ? `${range.start}` : `${range.start}-${range.end}`;
}

/**
 * 按自定义模板替换变量，未知变量原样保留
 *
 * @param template 自定义模板，如 `{absPath}#L{range}`
 * @param context 位置上下文
 * @return 替换后的文本
 */
export function renderTemplate(template: string, context: LocationContext): string {
	const variables: readonly string[] = TEMPLATE_VARIABLES;
	return template.replace(VARIABLE_REGEX, (placeholder: string, name: string) => {
		// 只替换约定的模板变量
		return variables.includes(name) ? context[name as keyof LocationContext] : placeholder;
	});
}

/**
 * 按输出格式生成位置字符串
 *
 * @param format 输出格式
 * @param context 位置上下文
 * @param customTemplate 自定义模板（仅自定义格式使用）
 * @return 位置字符串
 */
export function formatLocation(format: LocationFormat, context: LocationContext, customTemplate: string): string {
	switch (format) {
		case LocationFormat.AbsolutePathWithLine:
			return `${context.absPath}#L${context.range}`;
		case LocationFormat.AbsolutePath:
			return context.absPath;
		case LocationFormat.VaultPathWithLine:
			return `${context.relPath}#L${context.range}`;
		case LocationFormat.VaultPath:
			return context.relPath;
		case LocationFormat.ObsidianUri:
			// 库名与路径中可能有中文、空格，需要 URL 编码
			return `obsidian://open?vault=${encodeURIComponent(context.vaultName)}&file=${encodeURIComponent(context.relPath)}`;
		case LocationFormat.Wikilink:
			// 选区之前没有标题时只链接到文件
			return context.heading ? `[[${context.linkText}#${context.heading}]]` : `[[${context.linkText}]]`;
		case LocationFormat.Custom:
			return renderTemplate(customTemplate, context);
	}
}
