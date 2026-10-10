/**
 * 复制选区位置插件的公共类型、枚举与默认配置
 *
 * @author 启年
 * @createTime 2026-10-10 10:39
 */

/**
 * 位置输出格式
 */
export enum LocationFormat {
	/** 绝对路径+行号，如 `/Users/xx/笔记.md#L77-81` */
	AbsolutePathWithLine = "ABSOLUTE_PATH_WITH_LINE",
	/** 仅绝对路径，如 `/Users/xx/笔记.md` */
	AbsolutePath = "ABSOLUTE_PATH",
	/** 库内相对路径+行号，如 `目录/笔记.md#L77-81` */
	VaultPathWithLine = "VAULT_PATH_WITH_LINE",
	/** 仅库内相对路径，如 `目录/笔记.md` */
	VaultPath = "VAULT_PATH",
	/** Obsidian 打开链接，如 `obsidian://open?vault=xx&file=xx` */
	ObsidianUri = "OBSIDIAN_URI",
	/** Wiki 链接，带选区之前最近的标题，如 `[[笔记#标题]]` */
	Wikilink = "WIKILINK",
	/** 自定义模板 */
	Custom = "CUSTOM",
}

/**
 * 各输出格式在设置页下拉框中的展示名称
 */
export const LOCATION_FORMAT_LABELS: Record<LocationFormat, string> = {
	[LocationFormat.AbsolutePathWithLine]: "绝对路径+行号",
	[LocationFormat.AbsolutePath]: "仅绝对路径",
	[LocationFormat.VaultPathWithLine]: "库内路径+行号",
	[LocationFormat.VaultPath]: "仅库内路径",
	[LocationFormat.ObsidianUri]: "Obsidian 链接（obsidian://）",
	[LocationFormat.Wikilink]: "Wiki 链接（[[文件#标题]]）",
	[LocationFormat.Custom]: "自定义模板",
};

/**
 * 单个选区换算后的行范围（行号从 1 开始）
 */
export interface LineRange {
	/** 起始行 */
	start: number;
	/** 结束行 */
	end: number;
}

/**
 * 生成位置字符串所需的上下文，字段名即自定义模板中的变量名
 */
export interface LocationContext {
	/** 绝对路径 */
	absPath: string;
	/** 库内相对路径 */
	relPath: string;
	/** 库名 */
	vaultName: string;
	/** 带扩展名的文件名 */
	fileName: string;
	/** 不带扩展名的文件名 */
	basename: string;
	/** 起始行 */
	start: string;
	/** 结束行 */
	end: string;
	/** 单行时为 `77`，多行时为 `77-81` */
	range: string;
	/** 选区起始行之前最近的标题，没有时为空字符串 */
	heading: string;
	/** Wiki 链接使用的最短链接文本（不暴露为模板变量） */
	linkText: string;
}

/**
 * 自定义模板中可用的变量名
 */
export const TEMPLATE_VARIABLES = ["absPath", "relPath", "vaultName", "fileName", "basename", "start", "end", "range", "heading"] as const;

/**
 * 插件配置
 */
export interface CopyLocationSettings {
	/** 输出格式 */
	format: LocationFormat;
	/** 自定义模板，仅在输出格式为自定义模板时生效 */
	customTemplate: string;
	/** 复制后是否弹出「复制成功」提示 */
	showNotice: boolean;
}

/**
 * 默认配置
 */
export const DEFAULT_SETTINGS: CopyLocationSettings = {
	format: LocationFormat.AbsolutePathWithLine,
	customTemplate: "{absPath}#L{range}",
	showNotice: true,
};
