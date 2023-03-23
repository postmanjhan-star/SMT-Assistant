# Changelog
All notable changes to this project will be documented in this file.

The format is based on [如何維護更新日誌](https://keepachangelog.com/zh-TW/1.0.0/),
and this project adheres to [語意化版本](https://semver.org/lang/zh-TW/).

## Unreleased
### Added
### Changed
### Deprecated
### Removed
### Fixed
### Security


---

## 1.1.3.1 - 2023-03-09
### Changed
- [Hotfix] 富士打件機 API 查詢參數增加工件正反面參數。（31962177）

---

## 1.1.2 - 2023-01-13
### Added
- 松下打件機助手 CSV 上傳頁增加更明確的成功與失敗訊息。（dcc3a97e）
- 松下打件機助手 CSV 上傳頁增加 CSV 輸出選項說明。（dcc3a97e）
- 改善錯誤訊息。（bbe53694）
### Changed
- 松下打件機 CSV 檔案上傳作業之成品版次由人工指定，不由 CSV 內取得。（be884008）
- 松下打件機助手支援直接輸入成品料號。（fa3f12ce）
- 松下打件機助手支援一料多槽比對。（3695dc37）
- 富士打件機助手支援直接輸入成品料號。（c55b1954）
- 富士打件機助手比對表格改為 Tabulator。（c55b1954）

---

## 1.1.1 - 2022-11-16
### Added
- 所有更新日誌都在 [CHANGELOG.md](CHANGELOG.md)。（c64596cf）
- Fuji 打件機上料助手增加語音提示，輸入物料後會提示插槽位置。（1cb3481a）
- 首頁增加 Fuji 打件機上料助手連結。（1cb3481a）
- 網頁標題會根據當前所在應用而變，WMS / SMT / ...。（2b378302）
- 增加松下打件機上料助手。（b5407aa3、22805140）
### Changed
- Fuji 打件機上料助手網址變更為 /smt/fuji-mounter。（1cb3481a）
- Fuji 打件機上料助手首頁改為須輸入工單與機台號，內頁改為僅顯示該工單與機台號之物料資訊。（0ec99c29）
### Fixed
- Fuji 打件機上料助手內頁會將游標自動定位於物料條碼輸入框。（1cb3481a）

---

## 1.1.0 - 2022-10-21
### Added
- 二次首發

---

## 1.0.0
### Added
- 首發
