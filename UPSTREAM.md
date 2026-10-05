# 上游来源与许可义务

本项目导出自 [lishuangqiang/handdrawn-diagrams](https://github.com/lishuangqiang/handdrawn-diagrams)，在此基础上继续开发。

| 项目 | 值 |
| --- | --- |
| 上游仓库 | https://github.com/lishuangqiang/handdrawn-diagrams |
| 导入时上游分支 | `main` |
| 导入时上游提交 | `d95eca061d1da0a224d55d37d10d7dc18e718f47` |
| 导入日期 | 2026-10-05 |
| 导入版本 | `package.json` 中的 `0.1.0` |
| 本地提交历史 | 重新初始化，不包含上游提交历史；上游保留在 `upstream` remote |

## 同步上游更新

```bash
git fetch upstream
git log --oneline HEAD..upstream/main    # 查看上游新增提交
git cherry-pick <commit>                 # 或 git merge upstream/main
```

## 必须保留的文件

上游的原创代码、文档、Logo 与示例采用 MIT 许可，字体和第三方库保留各自许可。再分发时必须保留以下内容，不能删除或替换其版权行：

- `LICENSE`：MIT 许可，版权声明为 `Copyright (c) 2026 handdrawn-diagrams contributors`
- `THIRD_PARTY_NOTICES.md`：第三方资源来源与许可说明
- `assets/licenses/`：Rough.js（MIT）、Xiaolai 与 Excalifont（SIL OFL 1.1）的原始许可证

MIT 要求在所有副本或实质性部分中保留版权声明与许可声明；SIL OFL 1.1 要求再分发字体时同时保留其版权与许可文件。OFL 不限制用这些字体生成的图片，也不要求在图中署名。

## 建议改动

- 在 `LICENSE` 中追加你自己的版权行（例如 `Modifications Copyright (c) 2026 <你的名字>`），不要删掉原有声明。
- 更新 `package.json` 的 `author`、`repository`、`homepage`、`bugs` 字段，指向你自己的仓库。
- 替换 `assets/brand/` 下的 Logo 与横幅（`npm run brand` 可重建），避免与上游品牌混淆。
- 保留 `SKILL.md` 的 frontmatter `name: handdrawn-diagrams`，改名会破坏 `$handdrawn-diagrams` 的调用方式。
