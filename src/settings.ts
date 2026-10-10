/**
 * 插件设置页：输出格式、自定义模板与复制成功提示
 *
 * @author 启年
 * @createTime 2026-10-10 10:39
 */
import { App, PluginSettingTab, Setting } from "obsidian";
import type CopySelectionLocationPlugin from "./main";
import { DEFAULT_SETTINGS, LOCATION_FORMAT_LABELS, LocationFormat } from "./types";

/** 自定义模板变量说明，展示在模板输入框下方 */
const VARIABLE_DESCRIPTIONS: [string, string][] = [
	["{absPath}", "绝对路径"],
	["{relPath}", "库内相对路径"],
	["{vaultName}", "库名"],
	["{fileName}", "带扩展名的文件名"],
	["{basename}", "不带扩展名的文件名"],
	["{start}", "起始行"],
	["{end}", "结束行"],
	["{range}", "单行为 77，多行为 77-81"],
	["{heading}", "选区起始行之前最近的标题"],
];

/**
 * 插件设置页，修改后立即保存
 *
 * @author 启年
 * @createTime 2026-10-10 10:39
 */
export class CopyLocationSettingTab extends PluginSettingTab {
	/** 插件实例 */
	private readonly plugin: CopySelectionLocationPlugin;

	/**
	 * 创建设置页
	 *
	 * @param app Obsidian 应用实例
	 * @param plugin 插件实例
	 */
	constructor(app: App, plugin: CopySelectionLocationPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	/**
	 * 渲染设置页
	 */
	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		// region 输出格式
		new Setting(containerEl)
			.setName("输出格式")
			.setDesc("多个选区时每个选区一行。快捷键请在「设置 → 快捷键」中搜索「复制选区位置」绑定。")
			.addDropdown((dropdown) => {
				// 按枚举顺序填充下拉选项
				for (const format of Object.values(LocationFormat)) {
					dropdown.addOption(format, LOCATION_FORMAT_LABELS[format]);
				}
				dropdown.setValue(this.plugin.settings.format).onChange(async (value) => {
					this.plugin.settings.format = value as LocationFormat;
					await this.plugin.saveSettings();
					// 切换后重新渲染，以显示或隐藏自定义模板输入框
					this.display();
				});
			});
		// endregion

		// region 自定义模板
		if (this.plugin.settings.format === LocationFormat.Custom) {
			const templateSetting = new Setting(containerEl).setName("自定义模板").addText((text) =>
				text
					.setPlaceholder(DEFAULT_SETTINGS.customTemplate)
					.setValue(this.plugin.settings.customTemplate)
					.onChange(async (value) => {
						this.plugin.settings.customTemplate = value;
						await this.plugin.saveSettings();
					}),
			);
			// 在描述区列出可用变量
			const desc = templateSetting.descEl.createEl("ul");
			for (const [name, meaning] of VARIABLE_DESCRIPTIONS) {
				const li = desc.createEl("li");
				li.createEl("code", { text: name });
				li.appendText(`：${meaning}`);
			}
		}
		// endregion

		// region 提示
		new Setting(containerEl)
			.setName("复制成功提示")
			.setDesc("复制后在右上角弹出「复制成功」。")
			.addToggle((toggle) =>
				toggle.setValue(this.plugin.settings.showNotice).onChange(async (value) => {
					this.plugin.settings.showNotice = value;
					await this.plugin.saveSettings();
				}),
			);
		// endregion
	}
}
