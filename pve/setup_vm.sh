#!/bin/bash

# 提示用户输入虚拟机ID
read -p "请输入虚拟机ID（例如199）：" vm_id

# 提示用户输入OpenWrt镜像文件的路径
read -p "请输入OpenWrt镜像文件的路径（例如 /var/lib/vz/template/iso/immortalwrt-23.05.4-x86-64-generic-squashfs-combined-efi.img）：" img_path

# 创建虚拟机
qm create $vm_id \
--name immortalwrt \
--cpu qemu64 \
--cores 1 \
--memory 512 \
--net0 virtio,bridge=vmbr0 \
--scsihw virtio-scsi-pci \
--agent enabled=1

# 导入磁盘
qm importdisk $vm_id $img_path local-lvm

# 提示用户确认磁盘名称
echo "请确认导入的磁盘名称："
pvesm list local-lvm
read -p "请输入磁盘名称 (如 vm-199-disk-0): " disk_name

# 将磁盘映射到虚拟机
qm set $vm_id --scsi0 local-lvm:$disk_name

# 设置启动顺序
qm set $vm_id --boot order=scsi0