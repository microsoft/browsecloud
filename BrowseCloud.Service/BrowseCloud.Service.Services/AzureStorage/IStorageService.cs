// <copyright file="IStorageService.cs" company="Microsoft Corporation">
// Copyright (c) Microsoft Corporation. All rights reserved.
// </copyright>

namespace BrowseCloud.Service.Services.AzureStorage
{
    using System.Threading.Tasks;

    /// <summary>
    ///  Handles requests to an Azure Storage Account
    /// </summary>
    public interface IStorageService
    {
        /// <summary>
        /// Upload a string to a blob
        /// </summary>
        /// <param name="account">The storage account to use</param>
        /// <param name="documentText">The string to upload as a blob</param>
        /// <param name="containerName">The name of the storage container to store to. It will be created if it does not exist.</param>
        /// <param name="blobName">The name of the storage blob to store to. It will be created if it does not exist.</param>
        /// <returns></returns>
        Task UploadTextFileToBlob(StorageAccount account, string documentText, string containerName, string blobName);

        /// <summary>
        /// Get a string from a blob
        /// </summary>
        /// <param name="account">The storage account to use</param>
        /// <param name="containerName">The name of the storage container where the blob is contained</param>
        /// <param name="blobName">The name of the blob to get the string from</param>
        /// <returns></returns>
        Task<string> GetStringFromBlob(StorageAccount account, string containerName, string blobName);

        /// <summary>
        /// Delete a container and all blobs
        /// </summary>
        /// <param name="account">The storage account to use</param>
        /// <param name="containerName">The name of the container to delete</param>
        /// <returns></returns>
        Task DeleteContainer(StorageAccount account, string containerName);
    }
}
