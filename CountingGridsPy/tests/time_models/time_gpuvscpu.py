# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import unittest
import numpy as np
import torch
import os
import cProfile
from CountingGridsPy.models import CountingGridModel, CountingGridModelWithGPU


class TimeGPUvsCPU(object):
    def __init__(self):
        SEED = "03071994"
        np.random.seed(int(SEED))
        M, N = [1000, 500]
        extentSize = 40
        self.data = np.round(np.random.random((M, N)) * 10)
        self.extent = np.array([extentSize, extentSize])
        self.window = np.array([5, 5])
        self.pi_init = np.ones([extentSize] * 2 + [N]) / N
        self.cpuModel = CountingGridModel(self.extent, self.window)
        self.gpuModel = CountingGridModelWithGPU(self.extent, self.window)

        numIters = 50
        
        device = torch.device("cuda:0")
        
        gpuJob = '''
        self.gpuModel.fit(
            self.data,
            max_iter=numIters,
            pi=torch.tensor(self.pi_init, device=device, dtype=torch.double),
            layers=1
        )
        '''
        cProfile.run(gpuJob)

        cpuJob = '''
        self.cpuModel.fit(
            self.data,
            max_iter=numIters,
            returnSumSquareDifferencesOfPi=False,
            pi=np.copy(self.pi_init),
            layers=1
        )
        '''
        cProfile.run(cpuJob)