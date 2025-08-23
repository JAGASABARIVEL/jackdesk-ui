import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { ContextMenu, ContextMenuModule } from 'primeng/contextmenu';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressBarModule } from 'primeng/progressbar';
import { CardModule } from 'primeng/card';
import { FileManagerService } from '../../../shared/services/file-manager.service';
import { MenuItem, MessageService, TreeNode } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { Dialog } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';
import { ChipModule } from 'primeng/chip';
import { TreeModule } from 'primeng/tree';
import { TableModule } from 'primeng/table';
import { UserManagerService } from '../../../shared/services/user-manager.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarModule } from 'primeng/toolbar';
import { LayoutService } from '../../../layout/service/app.layout.service';
import { Subject, takeUntil } from 'rxjs';

interface FileMeta {
    id: number,
    name: string,
    s3_key: string,
    is_shared: boolean,
    is_folder: boolean,
    parent: any,
    created_at: any,
    icon: string,
    type: string,
    size: string
}

interface UserMeta {
    id: number,
    email: string,
    username: string
}

interface OrgUserMeta {
    details: {
        id: number,
        email: string,
        username: string
    }
}

interface FileShareMeta {
    user: number,
    email: string,
    file: number,
    can_read: boolean,
    can_write: boolean
}

@Component({
    selector: 'app-file-explorer',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        ContextMenuModule,
        InputTextModule,
        ButtonModule,
        ProgressBarModule,
        CardModule,
        ToastModule,
        Dialog,
        SelectModule,
        CheckboxModule,
        ChipModule,
        TreeModule,
        TableModule,
        ToolbarModule
    ],
    templateUrl: './explorer.component.html',
    styleUrls: ['./explorer.component.scss'],
    providers: [
        MessageService
    ],
})
export class ChatFileExplorerComponent implements OnInit, OnDestroy {

    constructor(
        private route: ActivatedRoute,
        private router: Router,
        private fileManagerService: FileManagerService,
        private userManagerService: UserManagerService,
        private messageService: MessageService,
        private layoutService: LayoutService
    ) { }

    private destroy$ = new Subject<void>();
    ngOnDestroy(): void {
  this.destroy$.next();
  this.destroy$.complete();
}

    profile;
    ngOnInit(): void {
        this.profile = JSON.parse(localStorage.getItem('profile'));
        if (!this.profile) {
            this.router.navigate(["/apps/login"]);
            return;
        }
        else {
            this.layoutService.state.staticMenuDesktopInactive = true;
            this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
            const fileId = params['file'];
            this.contextMenuItems = [
                { label: 'Download', icon: 'pi pi-download', command: () => this.downloadFile() },
                { label: 'Delete', icon: 'pi pi-trash', command: () => this.deleteFile() },
                { label: 'Share', icon: 'pi pi-share-alt', command: () => this.shareFile() }
            ];
            if (fileId) {
                this.navigateToFile(+fileId);
            } else {
                this.loadContent();
            }
        });
        }        
    }

    navigateToFile(fileId: number) {
        this.fileManagerService.list_file_from_id(fileId).pipe(takeUntil(this.destroy$)).subscribe((file: FileMeta) => {
            const parentId = file?.parent;
            if (!parentId) {
                this.loadHomeDirectoryContent(); // file is in root
                return;
            }

            this.loadFolderById(parentId);
        });
    }

    loadFolderById(folderId: number) {
        this.fileManagerService.list_file_from_id(folderId).pipe(takeUntil(this.destroy$)).subscribe((folder: FileMeta) => {
            this.loadHomeDirectoryContent(folder);
            //  this.current_folder = folder;
            //  this.loadFolderContent(folder);
        });
    }

    loadContent() {
        this.loadUsers();
        this.loadHomeDirectoryContent();
        this.loadUsagePercentage();

    }


    users: UserMeta[] = [];
    files: any[] = [];
    folders: any[] = [];
    mine_shared_folders = [];
    others_shared_folders = [];

    inner_files: FileMeta[] = [];
    inner_folders: FileMeta[] = [];
    current_folder: FileMeta;
    selectedFile: FileMeta;
    searchQuery: string = '';
    usedStorage: number = 50;
    totalStorage: number = 1000;
    viewMode: string = 'grid';
    contextMenuItems: MenuItem[] = [];

    loadUsers() {
        this.userManagerService.list_all_users().pipe(takeUntil(this.destroy$)).subscribe((response: UserMeta[]) => {
            this.users = response.filter((user) => user.id != this.profile.user.id)
            this.messageService.add({ severity: 'success', summary: 'Loaded users', detail: '', sticky: false });
        });
    }

    filteredFiles() {
        return this.inner_files.filter(file =>
            file.name?.toLowerCase().includes(this.searchQuery.toLowerCase())
        );
    }

    createFolder() {
        const folderName = prompt('Enter folder name:');
        this.fileManagerService.create_folder(
            {
                "name": folderName,
                "parent": this.current_folder?.id
            }
        ).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
            if (this.current_folder?.id) { // Signifies this is not home folder
                this.loadFolderContent(this.current_folder);
            }
            else {
                this.loadHomeDirectoryContent();
            }
        });
    }

    resetInput(event: any) {
        event.target.value = null;
    }

    uploadFile(event: any) {

        const file = event.target.files[0];
        if (!file) {
            console.error("No file selected!");
            return;
        }
        const formData = new FormData();
        formData.append("file", file); // Append the file
        formData.append("name", file.name)
        if (this.current_folder?.id) {
            formData.append("parent", String(this.current_folder?.id)); // (Optional) If you have a parent folder ID
        }
        this.fileManagerService.upload_file(formData).pipe(takeUntil(this.destroy$)).subscribe(
            response => {
                if (this.current_folder?.id) {
                    this.loadFolderContent(this.current_folder);
                }
                else {
                    this.loadHomeDirectoryContent();
                }
            },
            error => {
                console.error("File upload failed!", error);
            }
        );
    }

    storageUsageColorIndicatorLevel;
    loadUsagePercentage() {
        this.totalStorage = this.totalStorage ? (this.usedStorage / this.totalStorage) * 100 : 0;
        if (this.totalStorage >= 100) {
            this.storageUsageColorIndicatorLevel = 'storage-full';
        } else if (this.totalStorage >= 80) {
            this.storageUsageColorIndicatorLevel = 'storage-warning';
        }
        else {
            this.storageUsageColorIndicatorLevel = 'storage-ok';
        }
    }

    loadHomeDirectoryContent(fl: any = { "key": "home" }) {
        this.loadFolderContent(fl);
        this.folders = [];
        this.files = [];
        this.mine_shared_folders = [];
        this.others_shared_folders = [];

        this.fileManagerService.list_organize().pipe(takeUntil(this.destroy$)).subscribe((response) => {
            this.usedStorage = response["total_capacity_gb"];
            let home_folder = response["home"];
            let shared_folders_mine = response["shared_folders"]["mine"];
            let shared_folders_others = response["shared_folders"]["others"];

            // Function to transform API response into tree structure
            const transformToTree = (items: any[]): any[] => {
                return items.map(item => ({
                    key: item.id.toString(),
                    label: item.name,
                    data: item.is_folder ? `${item.name} Folder` : `${item.name} File`,
                    icon: item.is_folder ? 'pi pi-fw pi-folder' : this.get_file_type(item.name.split(".").pop()),
                    name: item.name,
                    s3_key: item.s3_key,
                    is_folder: item.is_folder,
                    owner: item.owner,
                    parent: item.parent,
                    created_at: item.created_at,
                    is_shared: item.is_shared || false,  // Determine if it's a shared item
                    children: item.children ? transformToTree(item.children) : []
                }));
            };

            // Process home directory (with shared items marked)
            this.folders = transformToTree(home_folder);

            // Process shared folders under "Mine"
            this.mine_shared_folders = transformToTree(shared_folders_mine);

            // Process shared folders under "Others"
            this.others_shared_folders = transformToTree(shared_folders_others);

            // Final structured data for UI display
            this.files = [
                {
                    key: 'home',
                    label: 'Home',
                    data: 'Home Directory',
                    icon: 'pi pi-fw pi-home',
                    children: this.folders
                },
                {
                    key: 'shared',
                    label: 'Shared Folders',
                    data: 'Folders Shared with You',
                    icon: 'pi pi-fw pi-share-alt',
                    children: [
                        {
                            key: 'shared-mine',
                            label: 'Mine',
                            data: 'Folders I Shared',
                            icon: 'pi pi-fw pi-folder-open',
                            children: this.mine_shared_folders
                        },
                        {
                            key: 'shared-others',
                            label: 'Others',
                            data: 'Folders Shared With Me',
                            icon: 'pi pi-fw pi-users',
                            children: this.others_shared_folders
                        }
                    ]
                }
            ];
        });
    }

    findNodeByKey(nodes: any[], key: string): any | null {
        for (let node of nodes) {
            if (node.key === key) {
                return node;
            }
            if (node.children && node.children.length > 0) {
                const found = this.findNodeByKey(node.children, key);
                if (found) return found;
            }
        }
        return null;
    }

    selectedHomeFile!: TreeNode;
    keys_to_be_skipped = ["shared", "shared-mine", "shared-others"]

    nodeSelect(event: any) {
        this.loadFolderContent(this.selectedHomeFile)
        this.messageService.add({ severity: 'info', summary: 'Node Selected', detail: event.node.label });
    }

    loadFolderContent(folder: any) {
        this.current_folder = folder;

        let parent = undefined;
        let isFolder = undefined;
        if (folder?.key) {
            //this.selectedHomeFile = this.findNodeByKey(this.files, folder.key);
            parent = folder.key == "home" ? null : folder.key;
            isFolder = this.keys_to_be_skipped.includes(folder.key) || folder.key == "home" ? true : folder.is_folder;
            if (this.keys_to_be_skipped.includes(folder.key)) {
                return;
            }
        }
        else if (folder?.id) {
            parent = folder.id;
            // This is repetitive now since to handle the above scenario where user clicks the shared content and for BE(back end) to suuport accordingly.
            isFolder = folder.is_folder;
        }
        this.inner_files = []
        this.fileManagerService.list_files_with_qparameter({ 'parent': parent, 'isFolder': isFolder }).pipe(takeUntil(this.destroy$)).subscribe((response) => {
            for (let _file of response) {
                if (_file.is_folder) {
                    _file["icon"] = 'pi pi-folder';
                    this.inner_files.push(_file);
                }
                else {
                    let file_ext = _file.name.split(".").pop();
                    // Special case where image file is sent without caption then webhook would add image_<id> as filename
                    if (file_ext.includes("image")) {
                        _file["type"] = "image";
                    }
                    else {
                        _file["type"] = this.get_file_type_raw(file_ext);
                    }
                    this.inner_files.push(_file);
                }
            }
        });
    }

    get_file_type(file_ext) {
        switch (file_ext) {
            case "pdf":
                return "pi pi-file-pdf";
            case "docx":
                return "pi pi-file-pdf";
            default:
                return "pi pi-file"
        }
    }

    get_file_type_raw(file_ext) {
        switch (file_ext) {
            case "pdf":
                return "pdf";
            case "docx":
                return "msword";
            case "png":
            case "jpg":
            case "jpeg":
                return "image";
            case "xlsx":
            case "xls":
                return "spreadsheet"
            default:
                return file_ext
        }
    }

    openFile(file: any) {
        //alert('Opening ' + file.name);
        if (file.is_folder) {
            this.loadFolderContent(file);
        }
    }

    downloadFile() {
        this.fileManagerService.download_file(this.selectedFile.id).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
            const link = document.createElement('a');
            link.href = response.download_url;  // Pre-signed S3 URL
            link.target = '_blank';  // Open in a new tab
            link.download = "file.pdf";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    deleteFile() {
        this.fileManagerService.delete_file({ "file": this.selectedFile.id }).pipe(takeUntil(this.destroy$)).subscribe((response) => {
            if (this.current_folder?.id) { // Signifies this is not home folder
                this.loadFolderContent(this.current_folder);
            }
            else {
                this.loadHomeDirectoryContent();
            }
            alert("File removed successfully!");
        })
    }

    sharedUsers = [];
    shareDialogVisible = false;
    selectedUser: UserMeta = null;
    selectedPermission: string = '';
    permissions = [{ label: 'View', value: true }, { label: 'Edit', value: true }];
    fileShare: FileShareMeta = {
        user: -1,
        email: "",
        file: -1,
        can_read: false,
        can_write: false
    };

    shareFile() {
        this.fileShare = {
            user: -1,
            email: "",
            file: -1,
            can_read: false,
            can_write: false
        };
        this.shareDialogVisible = true;
    }

    removeUser(user: any) {
        this.sharedUsers = this.sharedUsers.filter(u => u.user !== user.user);
    }

    confirmShareFile() {
        if (this.selectedUser) {
            this.fileShare.user = this.selectedUser.id;
            this.fileShare.email = this.selectedUser.email;
            this.fileShare.file = this.selectedFile.id;
            this.fileManagerService.share_file(this.fileShare).pipe(takeUntil(this.destroy$)).subscribe({
                next: (response) => {
                    this.sharedUsers.push(this.fileShare);
                    this.selectedUser = null;
                    this.fileShare = {
                        user: -1,
                        email: "",
                        file: -1,
                        can_read: false,
                        can_write: false
                    }
                },
                error: (err) => {
                    this.errorToast(err.error?.non_field_errors[0])
                }
            });
        }
        // Implement API call to share file here
    }

    errorToast(msg) {
        this.messageService.add({ severity: 'error', summary: 'Error', detail: msg, sticky: true });
    }

    closeShareDialog() {
        this.shareDialogVisible = false;
        this.loadHomeDirectoryContent();
    }





    revokeShareDialogVisible: boolean = false;
    fileUsers = [];
    removedFileUsers = []
    list_users_those_have_permissions(file_id) {
        this.fileManagerService.permission_list(file_id).pipe(takeUntil(this.destroy$)).subscribe((response: any) => {
            this.fileUsers = response;
            this.revokeShareDialogVisible = true;
        });
    }

    // Remove User from Sharing
    revokeRemoveUser(user_id: number) {
        let removed_user_index = this.fileUsers.findIndex(user => user.user === user_id)
        this.removedFileUsers.push(this.fileUsers[removed_user_index]);
        this.fileUsers = this.fileUsers.filter(user => user.user !== user_id);
    }

    // Save Changes (Call API to update permissions)
    saveRevokePermissions() {
        // Call API here to update permissions
        if (this.fileUsers.length === 0) {
            for (let file_rem_perm of this.removedFileUsers) {
                this.fileManagerService.revoke_share_file(file_rem_perm).pipe(takeUntil(this.destroy$)).subscribe(
                    (res) => {
                        this.loadHomeDirectoryContent();
                    },
                    (err) => {
                        console.error("Error revoking permission");
                    }
                );
            }

        }
        else {
            for (let file_perm of this.fileUsers) {
                this.fileManagerService.permission_update(file_perm).pipe(takeUntil(this.destroy$)).subscribe(
                    (res) => {
                        this.loadHomeDirectoryContent();
                    },
                    (err) => {
                        console.error("Erro updating permission for user ", file_perm.email);
                    }
                );
            }
        }
        this.revokeShareDialogVisible = false;
    }

    revokeFile() {
        this.list_users_those_have_permissions(this.selectedFile.id);
    }

    addShareContextMenu(file) {
        if (file?.owner === this.profile.user.id && !file.is_shared) {
            this.contextMenuItems.push({ label: 'Share', icon: 'pi pi-share-alt', command: () => this.shareFile() });
        }
    }

    addRevokeContextMenu(file) {
        if (file?.owner === this.profile.user.id && file.is_shared) {
            this.contextMenuItems.push({ label: 'Revoke', icon: 'pi pi-ban', command: () => this.revokeFile() });
        }
    }

    addDeleteContextMenu(file) {
        if (file?.owner === this.profile.user.id) {
            this.contextMenuItems.push({ label: 'Delete', icon: 'pi pi-trash', command: () => this.deleteFile() });
        }
    }

    onRightClick(event: MouseEvent, file: any, contextMenu: any) {
        this.selectedFile = file; // Store selected file
        // Dynamically set context menu items based on file properties

        this.contextMenuItems = [
            !file.is_folder
                ? { label: 'Download', icon: 'pi pi-download', command: () => this.downloadFile() } : { label: 'View', icon: 'pi pi-eye', command: () => this.openFile(file) },
        ];

        if (["owner", "individual"].includes(this.profile.user.role)) {

            this.addShareContextMenu(file);
            this.addRevokeContextMenu(file);
            this.addDeleteContextMenu(file);
        }
        else {
            this.addDeleteContextMenu(file)
        }
        contextMenu.show(event); // Show context menu
        event.preventDefault(); // Prevent default right-click
    }
}