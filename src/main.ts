/**
 * 插件入口：注册「复制选区位置」命令、编辑器右键菜单与设置页
 *
 * @author 启年
 * @createTime 2026-10-10 10:39
 */
import { Editor, FileSystemAdapter, MarkdownFileInfo, MarkdownView, Menu, Notice, Plugin, TFile } from "obsidian";
import { findNearestHeading, formatLocation, formatRange, toLineRanges } from "./location";
import { CopyLocationSettingTab } from "./settings";
import { CopyLocationSettings, DEFAULT_SETTINGS, LocationContext } from "./types";

/**
 * 复制选区位置插件，把当前选区所在文件与行号按配置格式复制到剪贴板
 *
 * @author 启年
 * @createTime 2026-10-10 10:39
 */
export default class CopySelectionLocationPlugin extends Plugin {
	/** 插件配置 */
	settings: CopyLocationSettings = { ...DEFAULT_SETTINGS };

	/**
	 * 插件加载
	 */
	async onload(): Promise<void> {
		await this.loadSettings();

		// region 命令、右键菜单、设置页
		// 不设默认热键，由用户在「设置 → 快捷键」中绑定
		this.addCommand({
			id: "copy-selection-location",
			name: "复制选区位置",
			editorCheckCallback: (checking: boolean, editor: Editor, ctx: MarkdownView | MarkdownFileInfo) => {
				// 阅读模式下拿不到选区行号，命令不可用
				if (!this.isEditing(ctx)) {
					return false;
				}
				if (!checking) {
					void this.copyLocation(editor, ctx.file);
				}
				return true;
			},
		});
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu: Menu, editor: Editor, info: MarkdownView | MarkdownFileInfo) => {
				// 只在编辑模式下展示菜单项
				if (!this.isEditing(info)) {
					return;
				}
				menu.addItem((item) =>
					item
						.setTitle("复制位置")
						.setIcon("map-pin")
						.setSection("action")
						.onClick(() => void this.copyLocation(editor, info.file)),
				);
			}),
		);
		this.addSettingTab(new CopyLocationSettingTab(this.app, this));
		// endregion
	}

	/**
	 * 判断当前视图是否处于可读取选区的编辑模式（源码模式或实时预览）
	 *
	 * @param ctx 当前编辑器所属视图
	 * @return 处于编辑模式且关联了文件时返回 true
	 */
	private isEditing(ctx: MarkdownView | MarkdownFileInfo): boolean {
		// 没有关联文件时无法生成路径
		if (!ctx.file) {
			return false;
		}
		// Markdown 视图需处于 source 模式（实时预览也属于 source 模式）
		return !(ctx instanceof MarkdownView) || ctx.getMode() === "source";
	}

	/**
	 * 生成当前所有选区的位置字符串并复制到剪贴板
	 *
	 * @param editor 当前编辑器
	 * @param file 当前文件
	 */
	private async copyLocation(editor: Editor, file: TFile | null): Promise<void> {
		if (!file) {
			return;
		}
		// 每个选区生成一行，去掉格式中不含行号时产生的重复行
		const lines = toLineRanges(editor.listSelections()).map((range) => {
			const context = this.buildContext(editor, file, range.start, range.end, formatRange(range));
			return formatLocation(this.settings.format, context, this.settings.customTemplate);
		});
		const text = Array.from(new Set(lines)).join("\n");
		try {
			await navigator.clipboard.writeText(text);
			// 按配置决定是否提示
			if (this.settings.showNotice) {
				new Notice("复制成功");
			}
		} catch (error) {
			console.error("[copy-selection-location] 写入剪贴板失败", error);
			new Notice("复制失败，请查看控制台日志");
		}
	}

	/**
	 * 组装单个选区的位置上下文
	 *
	 * @param editor 当前编辑器
	 * @param file 当前文件
	 * @param start 起始行（从 1 开始）
	 * @param end 结束行（从 1 开始）
	 * @param range 行范围展示文本
	 * @return 位置上下文
	 */
	private buildContext(editor: Editor, file: TFile, start: number, end: number, range: string): LocationContext {
		return {
			absPath: this.getAbsolutePath(file),
			relPath: file.path,
			vaultName: this.app.vault.getName(),
			fileName: file.name,
			basename: file.basename,
			start: `${start}`,
			end: `${end}`,
			range,
			// 标题按编辑器内容实时计算，避免元数据缓存滞后
			heading: findNearestHeading((line) => editor.getLine(line), start - 1),
			linkText: this.app.metadataCache.fileToLinktext(file, ""),
		};
	}

	/**
	 * 获取文件的绝对路径
	 *
	 * @param file 当前文件
	 * @return 绝对路径；非本地文件系统仓库时退回库内路径
	 */
	private getAbsolutePath(file: TFile): string {
		const adapter = this.app.vault.adapter;
		// 只有桌面端的本地文件系统才能拿到仓库根目录
		if (!(adapter instanceof FileSystemAdapter)) {
			return file.path;
		}
		// 去掉根目录末尾的分隔符后拼接库内路径
		return `${adapter.getBasePath().replace(/[\\/]+$/, "")}/${file.path}`;
	}

	/**
	 * 加载配置，缺失项使用默认值
	 */
	async loadSettings(): Promise<void> {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	/**
	 * 保存配置
	 */
	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}
}
