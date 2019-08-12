# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import torch
import scipy
import os
import torch.nn as nn
import torch.nn.functional as F
import numpy as np
from tqdm import tqdm
from CountingGridsPy.models import CountingGridModel


class CountingGridModelWithGPU(CountingGridModel):
    def __init__(self,extent,window):
        '''
        Assumes:
        extent is a 1-D numpy array of size D.
        window is a 1-D numpy array of size D.

        D is often 2, since it makes the model easily visualizable.
        '''
        self.extent = np.array(extent)
        self.window = np.array(window)

    # Has same numpy API - no need to change.
    # Potentially we can deleted this code, since we're inheriting this class from the numpy class
    def compute_h_noLoopFull(self, PI, w0, w1):
        '''
        Critical method for computing the histogram using the pi parameters.

        Potential optimization to remove this function to reduce an extra stack frame.
        '''
        return PI[w0:,w1:,:] - PI[:-w0,w1:,:] - PI[w0:,:-w1,:] + PI[:-w0,:-w1,:]

    def compute_h(self, pi, W):
        '''
        Compute the histogram.
        '''
        # optimization is to do this without moving any data back to the cpu to do the padding
        PI = np.pad(pi.cpu().numpy(), [(0,W[0]),(0,W[1]),(0,0)], 'wrap')
        PI = torch.from_numpy(np.pad(PI,[(1,0),(1,0),(0,0)],'constant')).cumsum(0).cumsum(1).cuda()
        cumsum_output = self.compute_h_noLoopFull(PI,W[0],W[1])
        return (
                    (cumsum_output[:-1,:-1,:]).permute((2,0,1)) / cumsum_output[:-1,:-1,:].sum(dim=2)
               ).permute((1, 2, 0))   

    def q_update(self, data):
        '''
        Updates belief of where document should be mapped.
        '''
        L = np.prod(self.extent)
        reshapedHistogram = torch.log(self.h).reshape((L, data.shape[1]))
        transposedDataMatrix = torch.transpose(data, 1, 0)

        lql = torch.matmul(reshapedHistogram,transposedDataMatrix) 
        lqlmax = torch.max(lql, 0)[0]
        min_prob = 1.0/(10 * L)
        Lq = (
            (lql-lqlmax) - torch.log(torch.sum(torch.exp(lql-lqlmax), 0))
        ).reshape(tuple(list(self.extent) + [data.shape[0]]))
        q = torch.exp(Lq)
        q[q < min_prob] = min_prob
        q = q / torch.sum(torch.sum(q, 0), 0)
        
        return q.permute([2,0,1])

    def pi_update(self, data, pseudocounts, alpha):
        T, Z = data.shape
        W = self.window
        device = torch.device("cuda:0")
        # QdotC is called nrm in matlab engine, but padding is done beforehand in matlab
       
        # self.permute([1,2,0])
        # [x,y,z] => [y,z,x]
        L = np.prod(self.extent)
        QdotC = torch.matmul(
            self.q.permute([1, 2, 0]).reshape((L, T)),
            data
        ).reshape(self.extent[0], self.extent[1], Z)
        
        # PyTorch only implements circular padding for 1 dimension at a time.
        # We will pass the data back to the CPU, do the padding, and bring it back to the GPU.
        QH = np.pad(
            (QdotC/(self.h + np.prod(self.window)*alpha)).cpu().numpy(),
            [(W[0], 0), (W[1], 0), (0, 0)],
            'wrap'
        ).cumsum(axis=0).cumsum(axis=1)
        QH = torch.tensor(QH, device=device, dtype=torch.double)
        
        w0 = W[0]; w1 = W[1]
        QH = self.compute_h_noLoopFull(QH, w0, w1)
        QH[QH < 0] = 0
        
        un_pi = pseudocounts + QH * (self.pi + alpha)
        mask = (torch.sum(un_pi, 2) != 0).double()
        not_mask = (torch.sum(un_pi, 2) == 0).double()
        denom = torch.sum(un_pi, 2)
        
        updated_pi = torch.transpose((torch.transpose(mask, 0, 1) * torch.transpose(un_pi, 0, 2)) / torch.transpose(denom, 0, 1), 0, 2) + \
            (1.0 / Z) * torch.transpose(torch.ones([Z, self.extent[1], self.extent[0]], device=device, dtype=torch.double) * torch.transpose(not_mask, 0, 1), 0, 2)
        return updated_pi

    def fit(self, data_cpu, max_iter=100, noise=.000001, learn_pi=True, pi=None, layers=1, output_directory="./", heartBeaters=None, writeOutput=True):
        '''
        Fits the model, using GPU.

        Assumes:
        1. pi is a torch tensor on the GPU
        '''
    
        if not os.path.exists(str(output_directory)):
            raise Exception("output_directory does not exist for counting grids trainer.")

        if not torch.cuda.is_available():
            raise Exception("No GPU available for training.")
        device = torch.device("cuda:0")
        alpha = 1e-10
        data = torch.tensor(data_cpu, device=device, dtype=torch.double)

        if pi is None:
            self.initializePi(data) # potentially optimize by initializing data in GPU 
            self.pi = torch.tensor(self.pi, device=device, dtype=torch.double)
        else:
            self.pi = pi

        self.h = self.compute_h(self.pi, self.window)
        P = np.prod(self.extent)
        T, Z = data.size()
        
        pseudocounts = torch.mean(data.sum(1) / P) / 2.5
        # q is an m x dim(extent) structure
        qshape = [len(data)]
        for v in self.extent:
            qshape.append(v)
        self.q = torch.zeros(tuple(qshape))
    
        for i in tqdm(range(max_iter)):    
            # E-Step 
            self.q = self.q_update(data)
            # M-Step
            if learn_pi:
                self.pi = self.pi_update(data, pseudocounts, alpha)
    
                self.h = self.compute_h(self.pi, self.window)
                [(h.makeProgress(int(100*i/max_iter)) if h is not None else False)
                for h in heartBeaters] if heartBeaters is not None else False

        if layers > 1:
            self.pi = self.pi.cpu().numpy()
            self.q = self.q.cpu().numpy()
            self.layercgdata = self.cg_layers(data, L=layers, noise=noise)
            self.pi = torch.tensor(self.pi, device=device, dtype=torch.double)
            self.q = torch.tensor(self.pi, device=device, dtype=torch.double)

        if writeOutput:
            if layers > 1:
                scipy.io.savemat(str(output_directory) + "/CountingGridDataMatrices.mat", self.layercgdata)
            else:
                scipy.io.savemat(str(output_directory) + "/CGData.mat", {"pi": self.pi, "q": self.q})
        return self.pi
